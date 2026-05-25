import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('אימייל לא תקין'),
  phone: z.string().regex(/^[\d+\-\s]{9,15}$/, 'מספר טלפון לא תקין'),
  password: z.string().min(8, 'סיסמה חייבת לפחות 8 תווים'),
  fullName: z.string().min(2, 'שם מלא נדרש'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotSchema = z.object({ email: z.string().email() });
export const resetSchema = z.object({
  token: z.string().min(8),
  password: z.string().min(8),
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
