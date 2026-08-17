const http = require('http');

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: 'localhost', port: 3000, path, method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const expect = (name, condition, actual) => {
  if (!condition) throw new Error(`${name} failed: ${JSON.stringify(actual)}`);
  console.log(`PASS: ${name}`);
};

async function signup(label, runId) {
  const response = await request('POST', '/auth/signup', { email: `${label}-${runId}@example.com`, password: 'Password123!', name: `User ${label}`, jobTitle: 'Developer' });
  expect(`sign up User ${label}`, response.status === 201, response);
  return { user: response.body.user, token: response.body.accessToken };
}

async function run() {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const user1 = await signup('one', runId); const user2 = await signup('two', runId); const user3 = await signup('three', runId);
  let response = await request('POST', '/projects', { name: `Access control ${runId}` }, user1.token);
  expect('owner creates project', response.status === 201, response); const projectId = response.body.id;
  response = await request('POST', `/projects/${projectId}/members`, { userId: user2.user.id, role: 'MEMBER' }, user1.token);
  expect('owner adds member', response.status === 201, response);
  response = await request('POST', '/issues', { title: 'Protected issue', projectId, assigneeId: user2.user.id }, user1.token);
  expect('owner creates issue', response.status === 201, response); const issueId = response.body.id;
  response = await request('GET', '/projects', null, user2.token); expect('member sees project in list', response.status === 200 && response.body.some((project) => project.id === projectId), response);
  response = await request('GET', `/projects/${projectId}`, null, user2.token); expect('member accesses project', response.status === 200, response);
  response = await request('GET', '/projects', null, user3.token); expect('non-member cannot see project', response.status === 200 && !response.body.some((project) => project.id === projectId), response);
  const forbidden = async (name, method, path, body) => { const result = await request(method, path, body, user3.token); expect(name, result.status === 403 || result.status === 404, result); };
  await forbidden('non-member cannot access project', 'GET', `/projects/${projectId}`);
  await forbidden('non-member cannot access issue', 'GET', `/issues/${issueId}`);
  await forbidden('non-member cannot list project issues', 'GET', `/issues?projectId=${projectId}`);
  await forbidden('non-member cannot create issue', 'POST', '/issues', { title: 'Forbidden', projectId });
  await forbidden('non-member cannot update issue', 'PATCH', `/issues/${issueId}/status`, { status: 'CLOSED' });
  await forbidden('non-member cannot comment', 'POST', `/issues/${issueId}/comments`, { body: 'Forbidden' });
  await forbidden('non-member cannot read comments', 'GET', `/issues/${issueId}/comments`);
  await forbidden('non-member cannot read activity', 'GET', `/issues/${issueId}/activity`);
  await forbidden('non-member cannot access members', 'POST', `/projects/${projectId}/members`, { userId: user3.user.id, role: 'MEMBER' });
  console.log('PROJECT MEMBERSHIP ACCESS-CONTROL: PASS');
}

run().catch((error) => { console.error('PROJECT MEMBERSHIP ACCESS-CONTROL: FAIL', error); process.exitCode = 1; });
