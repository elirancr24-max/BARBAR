import { prisma } from '../../lib/prisma';
import type { UpdateBusinessSettingsDto } from './business-settings.schema';

const SINGLETON_ID = 'singleton';

export async function getSettings() {
  const existing = await prisma.businessSettings.findUnique({ where: { id: SINGLETON_ID } });
  if (existing) return existing;
  return prisma.businessSettings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID },
    update: {},
  });
}

export async function updateSettings(patch: UpdateBusinessSettingsDto) {
  const before = await getSettings();
  const after = await prisma.businessSettings.update({
    where: { id: SINGLETON_ID },
    data: patch,
  });
  return { before, after };
}
