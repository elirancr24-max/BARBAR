import { PrismaClient } from '@prisma/client';
import { isProd } from '../config/env';

export const prisma = new PrismaClient({
  log: isProd ? ['error'] : ['warn', 'error'],
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
