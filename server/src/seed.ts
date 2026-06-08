// Seeds demo data so reviewers can log in immediately.
// Run with: npm run seed
import bcrypt from 'bcryptjs';
import { connectDb, disconnectDb } from './lib/db.js';
import { GymConfig, User } from './models/index.js';

const DEMO_PASSWORD = 'password123';

const demoUsers = [
  { name: 'Alice Member', email: 'member@fitsphere.app', role: 'MEMBER' as const },
  { name: 'Tina Trainer', email: 'trainer@fitsphere.app', role: 'TRAINER' as const },
  { name: 'Adam Admin', email: 'admin@fitsphere.app', role: 'ADMIN' as const },
];

async function main() {
  await connectDb();

  console.log('[seed] clearing existing users + gym config...');
  await User.deleteMany({});
  await GymConfig.deleteMany({});

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await User.insertMany(demoUsers.map((u) => ({ ...u, passwordHash })));

  await GymConfig.create({ name: 'FitSphere Gym', capacity: 50 });

  console.log('[seed] done. Demo accounts (password: %s):', DEMO_PASSWORD);
  demoUsers.forEach((u) => console.log(`  - ${u.role.padEnd(7)} ${u.email}`));

  await disconnectDb();
}

main().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
