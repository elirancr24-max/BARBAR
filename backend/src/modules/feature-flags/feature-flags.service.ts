import { prisma } from '../../lib/prisma';
import { cacheGet, cacheSet, cacheInvalidate } from '../../lib/redis';

const CACHE_KEY = 'ff:all';
const CACHE_TTL = 60;

export interface FlagRow {
  key: string;
  enabled: boolean;
  description: string | null;
  rolloutPct: number;
  rolesAllow: string[];
}

function fromDb(row: { key: string; enabled: boolean; description: string | null; rolloutPct: number; rolesAllow: string }): FlagRow {
  return {
    ...row,
    rolesAllow: row.rolesAllow ? row.rolesAllow.split(',').filter(Boolean) : [],
  };
}

export async function listFlags(): Promise<FlagRow[]> {
  const cached = await cacheGet<FlagRow[]>(CACHE_KEY);
  if (cached) return cached;
  const flags = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  const mapped = flags.map(fromDb);
  await cacheSet(CACHE_KEY, mapped, CACHE_TTL);
  return mapped;
}

export async function isEnabled(key: string, ctx?: { role?: string }): Promise<boolean> {
  const flags = await listFlags();
  const f = flags.find((x) => x.key === key);
  if (!f || !f.enabled) return false;
  if (f.rolesAllow.length && ctx?.role && !f.rolesAllow.includes(ctx.role)) return false;
  return true;
}

export async function updateFlag(
  key: string,
  patch: Partial<{ enabled: boolean; rolloutPct: number; rolesAllow: string[]; description: string }>,
) {
  const data: Record<string, unknown> = { ...patch };
  if (Array.isArray(patch.rolesAllow)) data.rolesAllow = patch.rolesAllow.join(',');
  const updated = await prisma.featureFlag.update({ where: { key }, data });
  await cacheInvalidate(CACHE_KEY);
  return fromDb(updated);
}
