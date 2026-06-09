import { createServer } from 'node:http';
import { createApp } from './app.js';
import { connectDb } from './lib/db.js';
import { initRealtime } from './lib/realtime.js';
import { env } from './config/env.js';

async function main() {
  await connectDb();
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
