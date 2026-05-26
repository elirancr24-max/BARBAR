import 'express-async-errors';
import http from 'http';
import { createApp } from './app';
import { initSocket } from './lib/socket';
import { logger } from './lib/logger';
import { env } from './config/env';
import { redis } from './lib/redis';
import { prisma } from './lib/prisma';
import { startReminderJob } from './lib/reminders';
import { startNoShowCron } from './lib/noShowCron';
import { startBirthdayCron } from './lib/birthdayCron';

async function start() {
  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);

  await redis.ping();
  await prisma.$queryRaw`SELECT 1`.catch(() => { /* ok */ });

  server.listen(env.PORT, () => {
    logger.info(`🚀 BarBar API listening on http://localhost:${env.PORT}`);
    logger.info(`📚 Swagger UI: http://localhost:${env.PORT}/docs`);
    startReminderJob();
    startNoShowCron();
    startBirthdayCron();
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    server.close();
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

start().catch((err) => {
  logger.error({ err }, '❌ Failed to start');
  process.exit(1);
});
