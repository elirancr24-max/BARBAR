import { Server as HTTPServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import { env } from '../config/env';
import { verifyAccessToken, type JwtPayload } from './jwt';
import { logger } from './logger';

export type AppointmentEvent =
  | 'appointment.created'
  | 'appointment.updated'
  | 'appointment.deleted'
  | 'appointment.status_changed';

export type SlotEvent = 'slot.locked' | 'slot.unlocked';

export type NotificationEvent = 'notification.new';

interface AuthedSocket extends Socket {
  user?: JwtPayload;
}

let io: IOServer | null = null;

export function initSocket(server: HTTPServer): IOServer {
  io = new IOServer(server, {
    cors: {
      origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Auth handshake — Bearer (Mobile) or cookie (Web)
  io.use((socket: AuthedSocket, next) => {
    try {
      const bearer = socket.handshake.auth?.token as string | undefined;
      const cookieHeader = socket.handshake.headers.cookie || '';
      const tokenFromCookie = cookieHeader
        .split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith('access_token='))
        ?.split('=')[1];

      const token = bearer || tokenFromCookie;
      if (!token) return next(new Error('UNAUTHORIZED'));

      socket.user = verifyAccessToken(token);
      next();
    } catch (err) {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket: AuthedSocket) => {
    const user = socket.user!;
    logger.debug({ userId: user.sub, role: user.role }, 'socket connected');

    // Tenant room (all admins + barbers)
    if (user.role === 'ADMIN' || user.role === 'BARBER') {
      socket.join('tenant:default');
    }

    if (user.role === 'BARBER') {
      socket.join(`employee:${user.sub}`);
    }

    if (user.role === 'CUSTOMER') {
      socket.join(`customer:${user.sub}`);
    }

    socket.on('disconnect', () => {
      logger.debug({ userId: user.sub }, 'socket disconnected');
    });
  });

  logger.info('✅ Socket.IO initialized');
  return io;
}

export function getIO(): IOServer {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

/**
 * Emit an event to relevant rooms based on appointment context.
 */
export function emitAppointmentEvent(
  event: AppointmentEvent,
  payload: { id: string; employeeUserId: string; customerId: string; [k: string]: unknown },
): void {
  if (!io) return;
  io.to('tenant:default').emit(event, payload);
  io.to(`employee:${payload.employeeUserId}`).emit(event, payload);
  io.to(`customer:${payload.customerId}`).emit(event, payload);
}

export function emitSlotEvent(event: SlotEvent, payload: { employeeId: string; startAt: string }): void {
  if (!io) return;
  io.to('tenant:default').emit(event, payload);
}
