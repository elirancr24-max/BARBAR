import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { auditFromReq } from '../../middleware/audit';
import { NotFound, BadRequest } from '../../lib/errors';

const router = Router();

const MAX_PHOTO_BYTES = 500 * 1024; // 500KB

const createSchema = z.object({
  kind: z.enum(['before', 'after', 'result']),
  url: z.string().min(1),
  publicGallery: z.boolean().optional().default(false),
});

const patchSchema = z.object({
  publicGallery: z.boolean().optional(),
  kind: z.enum(['before', 'after', 'result']).optional(),
});

function approxBytesOfDataUrl(url: string): number {
  // For data URLs, decode base64 length. For other URLs, just use char length.
  const match = /^data:[^;]+;base64,(.*)$/i.exec(url);
  if (match) {
    const b64 = match[1];
    // base64 length -> bytes
    return Math.floor((b64.length * 3) / 4);
  }
  return Buffer.byteLength(url, 'utf8');
}

// POST /appointments/:id/photos (admin/barber)
router.post(
  '/appointments/:id/photos',
  requireAuth,
  requireRole('ADMIN', 'BARBER'),
  validate(createSchema),
  async (req, res, next) => {
    const appt = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!appt) return next(NotFound('תור לא נמצא'));

    const { kind, url, publicGallery } = req.body as z.infer<typeof createSchema>;
    if (approxBytesOfDataUrl(url) > MAX_PHOTO_BYTES) {
      return next(BadRequest('התמונה גדולה מדי (מקסימום 500KB)'));
    }

    const created = await prisma.appointmentPhoto.create({
      data: {
        appointmentId: appt.id,
        kind,
        url,
        publicGallery: !!publicGallery,
      },
    });
    await auditFromReq(req, 'photo.create', 'AppointmentPhoto', created.id, null, {
      ...created,
      url: '[data]',
    });
    res.status(201).json(created);
  },
);

// GET /appointments/:id/photos (admin/barber)
router.get(
  '/appointments/:id/photos',
  requireAuth,
  requireRole('ADMIN', 'BARBER'),
  async (req, res, next) => {
    const appt = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!appt) return next(NotFound('תור לא נמצא'));
    const photos = await prisma.appointmentPhoto.findMany({
      where: { appointmentId: appt.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(photos);
  },
);

// DELETE /photos/:id (admin/barber)
router.delete(
  '/photos/:id',
  requireAuth,
  requireRole('ADMIN', 'BARBER'),
  async (req, res, next) => {
    const existing = await prisma.appointmentPhoto.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(NotFound('תמונה לא נמצאה'));
    await prisma.appointmentPhoto.delete({ where: { id: existing.id } });
    await auditFromReq(req, 'photo.delete', 'AppointmentPhoto', existing.id, { ...existing, url: '[data]' }, null);
    res.json({ ok: true });
  },
);

// PATCH /photos/:id (admin/barber)
router.patch(
  '/photos/:id',
  requireAuth,
  requireRole('ADMIN', 'BARBER'),
  validate(patchSchema),
  async (req, res, next) => {
    const existing = await prisma.appointmentPhoto.findUnique({ where: { id: req.params.id } });
    if (!existing) return next(NotFound('תמונה לא נמצאה'));
    const patch = req.body as z.infer<typeof patchSchema>;
    const updated = await prisma.appointmentPhoto.update({
      where: { id: existing.id },
      data: {
        ...(patch.publicGallery !== undefined && { publicGallery: patch.publicGallery }),
        ...(patch.kind && { kind: patch.kind }),
      },
    });
    await auditFromReq(req, 'photo.update', 'AppointmentPhoto', updated.id,
      { ...existing, url: '[data]' }, { ...updated, url: '[data]' });
    res.json(updated);
  },
);

// GET /gallery (PUBLIC)
router.get('/gallery', async (_req, res) => {
  const photos = await prisma.appointmentPhoto.findMany({
    where: { publicGallery: true },
    orderBy: { createdAt: 'desc' },
    take: 24,
    include: {
      appointment: {
        include: {
          service: { select: { name: true } },
          employee: { include: { user: { select: { fullName: true } } } },
        },
      },
    },
  });
  res.json(
    photos.map((p) => ({
      id: p.id,
      kind: p.kind,
      url: p.url,
      createdAt: p.createdAt,
      serviceName: p.appointment.service.name,
      employeeName: p.appointment.employee.user.fullName,
    })),
  );
});

export default router;
