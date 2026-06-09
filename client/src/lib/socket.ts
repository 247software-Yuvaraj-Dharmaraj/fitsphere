import { io, type Socket } from 'socket.io-client';

// In prod the API is on a different origin (VITE_API_URL); strip the /api suffix
// to get the socket origin. In dev the var is unset and we connect same-origin —
// Vite proxies /socket.io to the API (see vite.config.ts).
const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
const socketUrl = apiUrl ? apiUrl.replace(/\/api\/?$/, '') : undefined;

export const socket: Socket = socketUrl
  ? io(socketUrl, { autoConnect: false })
  : io({ autoConnect: false });
