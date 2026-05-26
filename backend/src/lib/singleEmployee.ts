import { prisma } from './prisma';

let cache: { id: string; until: number } | null = null;
const TTL_MS = 60_000;

export async function getPrimaryEmployeeId(): Promise<string> {
  const now = Date.now();
  if (cache && cache.until > now) return cache.id;
  const e = await prisma.employee.findFirst({
    where: { active: true },
    select: { id: true, user: { select: { createdAt: true } } },
    orderBy: { user: { createdAt: 'asc' } },
  });
  if (!e) throw new Error('No active employee — run seed');
  cache = { id: e.id, until: now + TTL_MS };
  return e.id;
}

export function clearPrimaryEmployeeCache() {
  cache = null;
}
