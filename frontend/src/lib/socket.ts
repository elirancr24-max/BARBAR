import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';

const URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(URL, {
      withCredentials: true,
      autoConnect: true,
      transports: ['websocket', 'polling'],
      auth: (cb) => {
        // Re-read token at connect-time (refresh-safe)
        cb({ token: getAccessToken() || '' });
      },
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
