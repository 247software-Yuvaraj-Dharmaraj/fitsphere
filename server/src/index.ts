import { createServer } from 'node:http';
import { createApp } from './app.js';
import { connectDb } from './lib/db.js';
import { initRealtime } from './lib/realtime.js';
import { seedDatabase } from './seed.js';
import { env } from './config/env.js';

async function main() {
  await connectDb();
  // TEMP (demo data): reseed the rich demo dataset on boot unless SEED_RESET=false.
  // Wrapped so a seeding issue can never stop the server. Revert the rich-seed commit to disable.
  if (process.env.SEED_RESET !== 'false') {
    try {
      await seedDatabase();
    } catch (err) {
      console.error('[seed] demo reseed failed (server still starts)', err);
    }
  }
  const app = createApp();
  const server = createServer(app);
  initRealtime(server); // Socket.IO shares the HTTP server
  server.listen(env.port, () => {
    console.log(`[server] listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error('[server] failed to start', err);
  process.exit(1);
});
