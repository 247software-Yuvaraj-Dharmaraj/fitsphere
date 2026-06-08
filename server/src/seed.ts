// Seeds demo data so reviewers can log in immediately.
// Run with: npm run seed
import bcrypt from 'bcryptjs';
import { connectDb, disconnectDb } from './lib/db.js';
import { GymConfig, Slot, User } from './models/index.js';

const DEMO_PASSWORD = 'password123';

const demoUsers = [
  { name: 'Alice Member', email: 'member@fitsphere.app', role: 'MEMBER' as const },
  { name: 'Tina Trainer', email: 'trainer@fitsphere.app', role: 'TRAINER' as const },
  { name: 'Adam Admin', email: 'admin@fitsphere.app', role: 'ADMIN' as const },
];

async function main() {
  await connectDb();

  console.log('[seed] clearing existing users, gym config, slots...');
  await User.deleteMany({});
  await GymConfig.deleteMany({});
  await Slot.deleteMany({});

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await User.insertMany(demoUsers.map((u) => ({ ...u, passwordHash })));

  await GymConfig.create({ name: 'FitSphere Gym', capacity: 50 });

  // Demo slots for today + next 2 days (UTC), typical gym hours.
  const slotTimes = [
    { startTime: '06:00', endTime: '07:00', capacity: 15 },
    { startTime: '07:00', endTime: '08:00', capacity: 15 },
    { startTime: '12:00', endTime: '13:00', capacity: 10 },
    { startTime: '18:00', endTime: '19:00', capacity: 20 },
    { startTime: '19:00', endTime: '20:00', capacity: 20 },
  ];
  const today = new Date();
  const slots = [];
  for (let d = 0; d < 3; d++) {
    const date = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + d),
    );
    for (const t of slotTimes) slots.push({ date, ...t, bookings: [] });
  }
  await Slot.insertMany(slots);
  console.log('[seed] created %d slots across 3 days', slots.length);

  console.log('[seed] done. Demo accounts (password: %s):', DEMO_PASSWORD);
  demoUsers.forEach((u) => console.log(`  - ${u.role.padEnd(7)} ${u.email}`));

  await disconnectDb();
}

main().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
