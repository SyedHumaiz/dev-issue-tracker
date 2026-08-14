import { PrismaClient } from '@prisma/client';
import { UsersService } from './src/users/users.service';

const prisma = new PrismaClient();
const usersService = new UsersService(prisma as any);

async function runTests() {
  console.log('--- Cleaning up DB ---');
  await prisma.activity.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  console.log('--- Seeding Users ---');
  // 12 test users
  const usersToCreate = [
    { email: 'ali@example.com', password: 'pw', name: 'Ali Khan' },
    { email: 'alice@example.com', password: 'pw', name: 'Alice Smith' },
    { email: 'bob@example.com', password: 'pw', name: 'Bob Jones' },
    { email: 'charlie@kh.com', password: 'pw', name: 'Charlie Brown' },
    { email: 'dave@example.com', password: 'pw', name: 'Dave Khoury' },
    { email: 'eve@example.com', password: 'pw', name: 'Eve White' },
    { email: 'frank@example.com', password: 'pw', name: 'Frank Black' },
    { email: 'grace@example.com', password: 'pw', name: 'Grace Green' },
    { email: 'heidi@example.com', password: 'pw', name: 'Heidi Blue' },
    { email: 'ivan@example.com', password: 'pw', name: 'Ivan Red' },
    { email: 'judy@example.com', password: 'pw', name: 'Judy Yellow' },
    { email: 'mallory@example.com', password: 'pw', name: 'Mallory Orange' },
  ];

  for (const u of usersToCreate) {
    await prisma.user.create({ data: u });
  }

  const allUsers = await prisma.user.findMany();
  const callerUser = allUsers.find(u => u.name === 'Ali Khan');

  console.log('\n--- Test 1: Multi-word query (ali kh) ---');
  let res = await usersService.search('ali kh');
  console.log(`Query 'ali kh' returned ${res.length} results.`);
  console.log(res.map(u => u.name));

  console.log('\n--- Test 2: Case-insensitive query (ALICE) ---');
  res = await usersService.search('ALICE');
  console.log(`Query 'ALICE' returned ${res.length} results.`);
  console.log(res.map(u => u.name));

  console.log('\n--- Test 3: Short query (<2 chars handled by controller normally, but let\'s test service logic with empty/whitespace) ---');
  res = await usersService.search('   ');
  console.log(`Query '   ' returned ${res.length} results.`);

  console.log('\n--- Test 4: Current user exclusion (caller: Ali Khan) ---');
  res = await usersService.search('ali', callerUser.id);
  console.log(`Query 'ali' excluding caller returned ${res.length} results.`);
  console.log(res.map(u => u.name));

  console.log('\n--- Test 5: 10 result limit ---');
  res = await usersService.search('example');
  console.log(`Query 'example' returned ${res.length} results (limit is 10).`);
  
  await prisma.$disconnect();
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
