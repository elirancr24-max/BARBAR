import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate';
import { getAvailableSlots } from './availability.service';

const router = Router();

const querySchema = z.object({
  employeeId: z.string().optional(),
  date: z.coerce.date(),
  serviceId: z.string(),
});

router.get('/', validate(querySchema, 'query'), async (req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slots = await getAvailableSlots(req.query as any);
  res.json({ slots });
});

export default router;
