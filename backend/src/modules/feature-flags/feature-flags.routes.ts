import { Router } from 'express';
import { z } from 'zod';
import { listFlags, updateFlag } from './feature-flags.service';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { auditFromReq } from '../../middleware/audit';

const router = Router();

router.get('/', async (_req, res) => {
  const flags = await listFlags();
  res.json(flags);
});

router.patch(
  '/:key',
  requireAuth,
  requireRole('ADMIN'),
  validate(
    z.object({
      enabled: z.boolean().optional(),
      rolloutPct: z.number().int().min(0).max(100).optional(),
      rolesAllow: z.array(z.string()).optional(),
      description: z.string().optional(),
    }),
  ),
  async (req, res) => {
    const updated = await updateFlag(req.params.key, req.body);
    await auditFromReq(req, 'featureFlag.update', 'FeatureFlag', req.params.key, null, updated);
    res.json(updated);
  },
);

export default router;
