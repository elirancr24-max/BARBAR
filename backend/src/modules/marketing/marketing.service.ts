import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import {
  renderTemplate,
  buildWhatsAppUrl,
  normalizePhone,
  type TemplateKey,
} from '../notifications/whatsapp';
import { getPrimaryEmployeeId } from '../../lib/singleEmployee';
import { makeUnsubscribeToken } from '../../lib/marketingUnsubscribe';

export type Segment =
  | 'dormant60d'
  | 'dormant90d'
  | 'vip'
  | 'birthday_month'
  | `tag:${string}`;

export interface Candidate {
  customerId: string;
  userId: string;
  name: string;
  phone: string;
  lastVisit: Date | null;
  tags: string;
  vip: boolean;
}

const LIMIT = 500;

function parseSegment(segment: string): { kind: string; tag?: string } | null {
  if (segment === 'dormant60d' || segment === 'dormant90d' || segment === 'vip' || segment === 'birthday_month') {
    return { kind: segment };
  }
  if (segment.startsWith('tag:')) {
    const tag = segment.slice(4).trim();
    if (!tag) return null;
    return { kind: 'tag', tag };
  }
  return null;
}

async function attachLastVisits(customerIds: string[]): Promise<Map<string, Date>> {
  if (customerIds.length === 0) return new Map();
  const grouped = await prisma.appointment.groupBy({
    by: ['customerId'],
    where: { customerId: { in: customerIds }, status: { in: ['COMPLETED', 'CONFIRMED'] } },
    _max: { endAt: true },
  });
  const map = new Map<string, Date>();
  for (const g of grouped) {
    if (g._max.endAt) map.set(g.customerId, g._max.endAt);
  }
  return map;
}

export async function listCampaignCandidates(segment: string): Promise<Candidate[]> {
  // Spam law (Amendment 40): ALWAYS filter to consenting customers only,
  // regardless of segment. This is non-negotiable.
  const parsed = parseSegment(segment);
  if (!parsed) return [];

  const now = new Date();

  if (parsed.kind === 'dormant60d' || parsed.kind === 'dormant90d') {
    const days = parsed.kind === 'dormant60d' ? 60 : 90;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Group by customer (User.id is appointment.customerId in this schema)
    const recent = await prisma.appointment.groupBy({
      by: ['customerId'],
      where: { status: { in: ['COMPLETED', 'CONFIRMED'] } },
      _max: { endAt: true },
    });

    const dormantUserIds = recent
      .filter((r) => r._max.endAt && r._max.endAt < cutoff)
      .map((r) => r.customerId);

    if (dormantUserIds.length === 0) return [];

    const customers = await prisma.customer.findMany({
      where: { userId: { in: dormantUserIds }, blocked: false, marketingConsent: true },
      include: { user: { select: { id: true, fullName: true, phone: true } } },
      take: LIMIT,
    });

    const lastVisits = await attachLastVisits(customers.map((c) => c.id));

    return customers
      .filter((c) => !!c.user.phone)
      .map((c) => ({
        customerId: c.id,
        userId: c.user.id,
        name: c.user.fullName,
        phone: c.user.phone!,
        lastVisit: recent.find((r) => r.customerId === c.user.id)?._max.endAt ?? lastVisits.get(c.id) ?? null,
        tags: c.tags,
        vip: c.vip,
      }));
  }

  if (parsed.kind === 'vip') {
    const customers = await prisma.customer.findMany({
      where: { vip: true, blocked: false, marketingConsent: true },
      include: { user: { select: { id: true, fullName: true, phone: true } } },
      take: LIMIT,
    });
    const lastVisits = await attachLastVisits(customers.map((c) => c.id));
    return customers
      .filter((c) => !!c.user.phone)
      .map((c) => ({
        customerId: c.id,
        userId: c.user.id,
        name: c.user.fullName,
        phone: c.user.phone!,
        lastVisit: lastVisits.get(c.id) ?? null,
        tags: c.tags,
        vip: c.vip,
      }));
  }

  if (parsed.kind === 'birthday_month') {
    const month = now.getMonth();
    const users = await prisma.user.findMany({
      where: { role: 'CUSTOMER', birthday: { not: null }, active: true, customer: { blocked: false, marketingConsent: true } },
      select: {
        id: true,
        fullName: true,
        phone: true,
        birthday: true,
        customer: { select: { id: true, tags: true, vip: true } },
      },
      take: LIMIT,
    });
    const filtered = users.filter((u) => u.birthday && u.birthday.getMonth() === month && u.customer);
    const lastVisits = await attachLastVisits(filtered.map((u) => u.customer!.id));
    return filtered
      .filter((u) => !!u.phone)
      .map((u) => ({
        customerId: u.customer!.id,
        userId: u.id,
        name: u.fullName,
        phone: u.phone!,
        lastVisit: lastVisits.get(u.customer!.id) ?? null,
        tags: u.customer!.tags,
        vip: u.customer!.vip,
      }));
  }

  if (parsed.kind === 'tag' && parsed.tag) {
    const customers = await prisma.customer.findMany({
      where: { blocked: false, marketingConsent: true, tags: { contains: parsed.tag } },
      include: { user: { select: { id: true, fullName: true, phone: true } } },
      take: LIMIT,
    });
    const lastVisits = await attachLastVisits(customers.map((c) => c.id));
    return customers
      .filter((c) => !!c.user.phone)
      .map((c) => ({
        customerId: c.id,
        userId: c.user.id,
        name: c.user.fullName,
        phone: c.user.phone!,
        lastVisit: lastVisits.get(c.id) ?? null,
        tags: c.tags,
        vip: c.vip,
      }));
  }

  return [];
}

export interface PreviewItem {
  customerId: string;
  name: string;
  phone: string;
  url: string;
  message: string;
  lastVisit: Date | null;
}

export async function previewBulkWhatsApp(
  segment: string,
  templateKind: TemplateKey,
): Promise<PreviewItem[]> {
  const candidates = await listCampaignCandidates(segment);
  if (candidates.length === 0) return [];

  const employeeId = await getPrimaryEmployeeId();
  const now = new Date();

  const publicBase = env.PUBLIC_URL.replace(/\/$/, '');
  const out: PreviewItem[] = [];
  for (const c of candidates) {
    const normalized = normalizePhone(c.phone);
    if (!normalized) continue;
    const unsubscribeLink = `${publicBase}/unsubscribe?t=${makeUnsubscribeToken(c.customerId)}`;
    const { enabled, message } = await renderTemplate(employeeId, templateKind, {
      customerName: c.name,
      serviceName: '',
      employeeName: '',
      startAt: now,
      businessName: env.BUSINESS_NAME,
      unsubscribeLink,
    });
    if (!enabled) continue;
    const url = buildWhatsAppUrl(normalized, message);
    if (!url) continue;
    out.push({
      customerId: c.customerId,
      name: c.name,
      phone: normalized,
      url,
      message,
      lastVisit: c.lastVisit,
    });
  }
  return out;
}

export async function logBulkSent(
  customerIds: string[],
  templateKind: TemplateKey,
): Promise<{ logged: number }> {
  if (customerIds.length === 0) return { logged: 0 };
  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    include: { user: { select: { fullName: true, phone: true } } },
  });

  const employeeId = await getPrimaryEmployeeId();
  const now = new Date();

  const publicBase = env.PUBLIC_URL.replace(/\/$/, '');
  let logged = 0;
  for (const c of customers) {
    const phone = c.user.phone ? normalizePhone(c.user.phone) : null;
    if (!phone) continue;
    const unsubscribeLink = `${publicBase}/unsubscribe?t=${makeUnsubscribeToken(c.id)}`;
    const { message } = await renderTemplate(employeeId, templateKind, {
      customerName: c.user.fullName,
      serviceName: '',
      employeeName: '',
      startAt: now,
      businessName: env.BUSINESS_NAME,
      unsubscribeLink,
    });
    await prisma.notificationLog.create({
      data: {
        channel: 'whatsapp',
        recipient: phone,
        message,
        status: 'sent_manual',
        meta: JSON.stringify({ kind: templateKind, customerId: c.id }),
      },
    });
    logged++;
  }
  return { logged };
}
