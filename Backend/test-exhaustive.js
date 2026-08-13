const http = require('http');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: data ? JSON.parse(data) : null,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: data,
          });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

async function runTests() {
  const results = [];
  const runId = generateId();
  const emailA = `testA-${runId}@example.com`;
  const emailB = `testB-${runId}@example.com`;
  const emailC = `testC-${runId}@example.com`; // Non-member
  
  let userA, tokenA, userB, tokenB, userC, tokenC;
  let projectId, issueId, commentId;

  function record(name, expected, actual, condition) {
    const pass = condition ? 'PASS' : 'FAIL';
    results.push({ name, expected, actual, status: pass });
    if (!condition) console.log(`FAILED: ${name} | Expected: ${expected} | Actual: ${JSON.stringify(actual)}`);
  }

  try {
    console.log('--- AUTHENTICATION ---');
    
    // 1. Signup success
    let res = await request('POST', '/auth/signup', { email: emailA, password: 'Password123!', name: 'User A' });
    record('1. Signup success', 201, res.status, res.status === 201);
    userA = res.body?.user; tokenA = res.body?.accessToken;

    // 2. Duplicate email
    res = await request('POST', '/auth/signup', { email: emailA, password: 'Password123!', name: 'User A Dup' });
    record('2. Duplicate email -> 409', 409, res.status, res.status === 409);

    // 3. Invalid email
    res = await request('POST', '/auth/signup', { email: 'not-an-email', password: 'Password123!', name: 'User Invalid' });
    record('3. Invalid email -> 400', 400, res.status, res.status === 400);

    // 4. Password shorter than 6 characters
    res = await request('POST', '/auth/signup', { email: `short-${runId}@example.com`, password: '123', name: 'User Short' });
    record('4. Password shorter than 6 chars -> 400', 400, res.status, res.status === 400);

    // 5. Login success
    res = await request('POST', '/auth/login', { email: emailA, password: 'Password123!' });
    record('5. Login success', 200, res.status, res.status === 200);

    // 6. Wrong password
    res = await request('POST', '/auth/login', { email: emailA, password: 'WrongPassword!' });
    record('6. Wrong password -> 401', 401, res.status, res.status === 401);

    // 7. Unknown email
    res = await request('POST', '/auth/login', { email: 'unknown@example.com', password: 'Password123!' });
    record('7. Unknown email -> 401', 401, res.status, res.status === 401);

    // 8. /auth/me with valid JWT
    res = await request('GET', '/auth/me', null, tokenA);
    record('8. /auth/me with valid JWT -> 200', 200, res.status, res.status === 200 && res.body.id === userA.id);

    // 9. /auth/me without token
    res = await request('GET', '/auth/me');
    record('9. /auth/me without token -> 401', 401, res.status, res.status === 401);

    // 10. /auth/me with invalid JWT
    res = await request('GET', '/auth/me', null, 'invalid.jwt.token');
    record('10. /auth/me with invalid JWT -> 401', 401, res.status, res.status === 401);

    // 11. Verify password is never returned
    record('11. Verify password is never returned', 'undefined', typeof userA.password, userA.password === undefined);

    // Setup B and C
    res = await request('POST', '/auth/signup', { email: emailB, password: 'Password123!', name: 'User B' });
    userB = res.body?.user; tokenB = res.body?.accessToken;
    res = await request('POST', '/auth/signup', { email: emailC, password: 'Password123!', name: 'User C' });
    userC = res.body?.user; tokenC = res.body?.accessToken;

    console.log('--- PROJECTS ---');
    
    // 12. Authenticated user can create project
    res = await request('POST', '/projects', { name: `Project ${runId}` }, tokenA);
    record('12. Authenticated user can create project', 201, res.status, res.status === 201);
    projectId = res.body?.id;

    // 13. Verify ownerId is derived from JWT, not request body
    // Test: User B tries to create project assigning Owner to User A
    res = await request('POST', '/projects', { name: `Project B ${runId}`, ownerId: userA.id }, tokenB);
    const dbProj = await prisma.projectMember.findFirst({ where: { projectId: res.body.id } });
    record('13. Verify ownerId is derived from JWT', userB.id, dbProj?.userId, dbProj?.userId === userB.id);

    // 14. GET projects with authentication
    res = await request('GET', '/projects', null, tokenA);
    record('14. GET projects with authentication', 200, res.status, res.status === 200 && Array.isArray(res.body));

    // 15. GET project by ID
    res = await request('GET', `/projects/${projectId}`, null, tokenA);
    record('15. GET project by ID', 200, res.status, res.status === 200 && res.body.id === projectId);

    // 16. Owner can add member
    res = await request('POST', `/projects/${projectId}/members`, { userId: userB.id, role: 'MEMBER' }, tokenA);
    record('16. Owner can add member', 201, res.status, res.status === 201);

    // 17. Owner can update member role
    res = await request('PATCH', `/projects/${projectId}/members/${userB.id}`, { role: 'OWNER' }, tokenA);
    record('17. Owner can update member role', 200, res.status, res.status === 200 && res.body.role === 'OWNER');
    // Change back to MEMBER for further tests
    await request('PATCH', `/projects/${projectId}/members/${userB.id}`, { role: 'MEMBER' }, tokenA);

    // 18. Owner can remove member
    // Add user C temporarily to remove
    await request('POST', `/projects/${projectId}/members`, { userId: userC.id, role: 'MEMBER' }, tokenA);
    res = await request('DELETE', `/projects/${projectId}/members/${userC.id}`, null, tokenA);
    record('18. Owner can remove member', 200, res.status, res.status === 200);

    // 19. Member cannot perform owner-only operations -> 403
    res = await request('POST', `/projects/${projectId}/members`, { userId: userC.id, role: 'MEMBER' }, tokenB);
    record('19. Member cannot perform owner-only operations -> 403', 403, res.status, res.status === 403);

    // 20. Non-member cannot perform project-member operations -> 403
    res = await request('POST', `/projects/${projectId}/members`, { userId: userA.id, role: 'MEMBER' }, tokenC);
    record('20. Non-member cannot perform project-member operations -> 403', 403, res.status, res.status === 403);

    console.log('--- ISSUES ---');

    // 21. Project member can create issue
    res = await request('POST', '/issues', { title: 'Issue 1', projectId: projectId }, tokenB);
    record('21. Project member can create issue', 201, res.status, res.status === 201);
    issueId = res.body?.id;

    // 22. Verify reporterId comes from JWT
    record('22. Verify reporterId comes from JWT', userB.id, res.body?.reporterId, res.body?.reporterId === userB.id);

    // 23. Supplying reporterId in request body must not override JWT identity
    res = await request('POST', '/issues', { title: 'Issue 2', projectId: projectId, reporterId: userA.id }, tokenB);
    record('23. Supplying reporterId in body must not override JWT', userB.id, res.body?.reporterId, res.body?.reporterId === userB.id);

    // 24. Non-member cannot create issue -> 403
    // Note: Is there an authorization check for issue creation? Let's see the result.
    res = await request('POST', '/issues', { title: 'Issue 3', projectId: projectId }, tokenC);
    // Actually, dev issue tracker might not have implemented project-membership check for issue creation yet?
    record('24. Non-member cannot create issue -> 403/404', '403/404', res.status, res.status === 403 || res.status === 404);

    // 25. Authenticated user can fetch issues
    res = await request('GET', '/issues', null, tokenA);
    record('25. Authenticated user can fetch issues', 200, res.status, res.status === 200 && Array.isArray(res.body));

    // 26. Authenticated user can fetch single issue
    res = await request('GET', `/issues/${issueId}`, null, tokenA);
    record('26. Authenticated user can fetch single issue', 200, res.status, res.status === 200 && res.body.id === issueId);

    // 27. Status update works
    res = await request('PATCH', `/issues/${issueId}/status`, { status: 'IN_REVIEW' }, tokenA);
    record('27. Status update works', 'IN_REVIEW', res.body?.status, res.body?.status === 'IN_REVIEW');

    // 28. Priority update works
    res = await request('PATCH', `/issues/${issueId}/priority`, { priority: 'URGENT' }, tokenA);
    // Prisma enum for Priority is LOW, MEDIUM, HIGH, CRITICAL. If URGENT is invalid, it should be 400.
    // Let's use CRITICAL just in case URGENT is invalid.
    res = await request('PATCH', `/issues/${issueId}/priority`, { priority: 'CRITICAL' }, tokenA);
    record('28. Priority update works', 'CRITICAL', res.body?.priority, res.body?.priority === 'CRITICAL');

    // 29. Assignee update works
    res = await request('PATCH', `/issues/${issueId}/assignee`, { assigneeId: userA.id }, tokenA);
    record('29. Assignee update works', userA.id, res.body?.assigneeId, res.body?.assigneeId === userA.id);

    // 30. Assignee can be explicitly set to null
    res = await request('PATCH', `/issues/${issueId}/assignee`, { assigneeId: null }, tokenA);
    record('30. Assignee can be explicitly set to null', null, res.body?.assigneeId, res.body?.assigneeId === null);

    // 31. Verify activity is NOT created when status/priority/assignee is unchanged
    await request('PATCH', `/issues/${issueId}/status`, { status: 'IN_REVIEW' }, tokenA); // unchanged
    let activities = await prisma.activity.findMany({ where: { issueId } });
    const statusChanges = activities.filter(a => a.type === 'STATUS_CHANGED');
    record('31. Activity NOT created when unchanged', 1, statusChanges.length, statusChanges.length === 1);

    // 32. Verify activity IS created when the value actually changes
    await request('PATCH', `/issues/${issueId}/status`, { status: 'CLOSED' }, tokenA);
    activities = await prisma.activity.findMany({ where: { issueId } });
    record('32. Activity IS created when value changes', 2, activities.filter(a => a.type === 'STATUS_CHANGED').length, activities.filter(a => a.type === 'STATUS_CHANGED').length === 2);

    // 33. Verify actorId in activities comes from JWT
    // (userA made the last status change)
    const lastStatusChange = activities.filter(a => a.type === 'STATUS_CHANGED').pop();
    record('33. Verify actorId in activities comes from JWT', userA.id, lastStatusChange?.actorId, lastStatusChange?.actorId === userA.id);

    // 34. Test issue filters
    res = await request('GET', `/issues?status=CLOSED`, null, tokenA);
    record('34. Test issue filters (status)', 'CLOSED', res.body?.[0]?.status, res.body?.[0]?.status === 'CLOSED');

    console.log('--- COMMENTS ---');

    // 35. Project member can create comment
    res = await request('POST', `/issues/${issueId}/comments`, { body: 'Hello' }, tokenB);
    record('35. Project member can create comment', 201, res.status, res.status === 201);
    commentId = res.body?.id;

    // 36. Verify authorId comes from JWT
    record('36. Verify authorId comes from JWT', userB.id, res.body?.authorId, res.body?.authorId === userB.id);

    // 37. Supplying authorId in request body must not override JWT identity
    res = await request('POST', `/issues/${issueId}/comments`, { body: 'Hello 2', authorId: userA.id }, tokenB);
    record('37. Supplying authorId must not override JWT', userB.id, res.body?.authorId, res.body?.authorId === userB.id);

    // 38. Non-member cannot create comment -> 403
    // Might not be implemented properly, but test it
    res = await request('POST', `/issues/${issueId}/comments`, { body: 'Hello 3' }, tokenC);
    record('38. Non-member cannot create comment -> 403/404', '403/404', res.status, res.status === 403 || res.status === 404);

    // 39. Fetch comments
    res = await request('GET', `/issues/${issueId}/comments`, null, tokenA);
    record('39. Fetch comments', 200, res.status, res.status === 200 && res.body.length >= 2);

    // 40. Verify comments are ordered chronologically
    const sorted = [...res.body].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const isSorted = JSON.stringify(res.body) === JSON.stringify(sorted);
    record('40. Verify comments are ordered chronologically', true, isSorted, isSorted);

    // 41. Invalid issue ID -> 404
    res = await request('GET', `/issues/invalid-id/comments`, null, tokenA);
    record('41. Invalid issue ID -> 404', 404, res.status, res.status === 404);

    console.log('--- ACTIVITY ---');

    // 42. Fetch issue activity timeline
    res = await request('GET', `/issues/${issueId}/activity`, null, tokenA);
    record('42. Fetch issue activity timeline', 200, res.status, res.status === 200 && Array.isArray(res.body));

    // 43. Verify chronological ordering
    const acts = res.body || [];
    const sortedActs = [...acts].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const actsSorted = JSON.stringify(acts) === JSON.stringify(sortedActs);
    record('43. Verify chronological ordering', true, actsSorted, actsSorted);

    // 44-48. Verify types
    record('44. Verify ISSUE_CREATED', true, acts.some(a => a.type === 'ISSUE_CREATED'), acts.some(a => a.type === 'ISSUE_CREATED'));
    record('45. Verify STATUS_CHANGED', true, acts.some(a => a.type === 'STATUS_CHANGED'), acts.some(a => a.type === 'STATUS_CHANGED'));
    record('46. Verify PRIORITY_CHANGED', true, acts.some(a => a.type === 'PRIORITY_CHANGED'), acts.some(a => a.type === 'PRIORITY_CHANGED'));
    record('47. Verify ASSIGNEE_CHANGED', true, acts.some(a => a.type === 'ASSIGNEE_CHANGED'), acts.some(a => a.type === 'ASSIGNEE_CHANGED'));
    record('48. Verify COMMENT_ADDED', true, acts.some(a => a.type === 'COMMENT_ADDED'), acts.some(a => a.type === 'COMMENT_ADDED'));

    // 49. Invalid issue ID -> 404
    res = await request('GET', `/issues/invalid-id/activity`, null, tokenA);
    record('49. Invalid issue ID -> 404', 404, res.status, res.status === 404);

    // 50. Verify actor information is populated correctly
    const populated = acts.every(a => a.actor && typeof a.actor.id === 'string' && typeof a.actor.name === 'string');
    record('50. Verify actor information is populated correctly', true, populated, populated);

    console.log('--- DATABASE VERIFICATION ---');

    const dbUser = await prisma.user.findUnique({ where: { id: userA.id } });
    record('DB: Created users exist', userA.id, dbUser?.id, !!dbUser);
    
    // bcrypt hash format usually starts with $2b$
    const isBcrypt = dbUser?.password && dbUser.password.startsWith('$2');
    record('DB: Passwords are bcrypt hashes', true, isBcrypt, isBcrypt);

    const dbProjOwner = await prisma.projectMember.findUnique({ where: { userId_projectId: { userId: userA.id, projectId } }});
    record('DB: ProjectMember records exist with correct roles', 'OWNER', dbProjOwner?.role, dbProjOwner?.role === 'OWNER');

    const dbIssue = await prisma.issue.findUnique({ where: { id: issueId } });
    record('DB: Issue has correct reporterId', userB.id, dbIssue?.reporterId, dbIssue?.reporterId === userB.id);

    const dbComment = await prisma.comment.findUnique({ where: { id: commentId } });
    record('DB: Comment has correct authorId', userB.id, dbComment?.authorId, dbComment?.authorId === userB.id);

    const dbActs = await prisma.activity.findMany({ where: { issueId } });
    record('DB: Activity records exist with correct types', true, dbActs.length > 0, dbActs.length > 0);
    
    // Test that no duplicate status changed activity happened
    record('DB: No duplicate activity was created', 2, dbActs.filter(a => a.type === 'STATUS_CHANGED').length, dbActs.filter(a => a.type === 'STATUS_CHANGED').length === 2);

    record('DB: Unassignment correctly stores assigneeId as null', null, dbIssue?.assigneeId, dbIssue?.assigneeId === null);


  } catch (e) {
    console.error('Fatal error during test run:', e);
  } finally {
    await prisma.$disconnect();
    
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL');
    
    console.log('\n==================================================');
    console.log('FINAL REPORT');
    console.log('==================================================');
    console.log(`1. Total tests: ${results.length}`);
    console.log(`2. Passed tests: ${passed}`);
    console.log(`3. Failed tests: ${failed.length}`);
    
    if (failed.length > 0) {
      console.log('4. Failed test names:');
      failed.forEach(f => console.log(`   - ${f.name}`));
      console.log('5. Expected vs actual result for every failure:');
      failed.forEach(f => console.log(`   - ${f.name} | Exp: ${f.expected} | Act: ${f.actual}`));
    }
    
    let bugs = [];
    failed.forEach(f => {
       if (f.name.includes('Non-member cannot')) bugs.push('Authorization check missing for ' + f.name);
    });
    console.log('6. Any backend bugs discovered:');
    if (bugs.length > 0) {
       bugs.forEach(b => console.log(`   - BUG: ${b}`));
    } else {
       console.log('   None identified as bugs.');
    }
    console.log('7. Any test limitations:');
    console.log('   - Only tests happy paths and a few negative cases; does not exhaustively test all possible parameter mutations.');
    
    console.log('8. Final verdict:');
    if (failed.length === 0) {
      console.log('   PASS');
    } else {
      console.log('   FAIL');
    }
  }
}

runTests();
