import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { auditFromReq } from '../../middleware/audit';
import { updateBusinessSettingsSchema } from './business-settings.schema';
import { getSettings, updateSettings } from './business-settings.service';

const router = Router();

// Any authed user can read — needed by other modules (e.g. deposits, reminders, commissions)
router.get('/', requireAuth, async (_req, res) => {
  const settings = await getSettings();
  res.json(settings);
});

router.put(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate(updateBusinessSettingsSchema),
  async (req, res) => {
    const { before, after } = await updateSettings(req.body);
    await auditFromReq(req, 'business-settings.updated', 'BusinessSettings', 'singleton', before, after);
    res.json(after);
  },
);

export default router;
