import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { env } from '../config/env.js';

// Single Socket.IO instance, attached to the HTTP server in index.ts.
let io: Server | null = null;

export function initRealtime(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: env.clientOrigin, credentials: true },
  });
  io.on('connection', (socket) => {
    console.log('[realtime] client connected', socket.id);
  });
  return io;
}

// Broadcast a new occupancy snapshot to all connected clients. No-op when the
// socket server isn't running (e.g. in tests), so callers don't need guards.
export function emitOccupancy(snapshot: unknown): void {
  io?.emit('occupancy', snapshot);
}
