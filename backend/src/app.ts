import express, { type Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { logger } from './lib/logger';
import { errorHandler, notFoundHandler } from './middleware/error';
import { generalLimiter } from './middleware/rateLimit';
import { openapiSpec } from './docs/swagger';

import authRoutes from './modules/auth/auth.routes';
import servicesRoutes from './modules/services/services.routes';
import employeesRoutes from './modules/employees/employees.routes';
import customersRoutes from './modules/customers/customers.routes';
import customerQuickRoutes from './modules/customers/customer-quick.routes';
import workingHoursRoutes from './modules/working-hours/working-hours.routes';
import timeOffRoutes from './modules/time-off/time-off.routes';
import availabilityRoutes from './modules/availability/availability.routes';
import slotsRoutes from './modules/appointments/slots.routes';
import appointmentsRoutes from './modules/appointments/appointments.routes';
import guestRoutes from './modules/appointments/guest.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import reportsRoutes from './modules/reports/reports.routes';
import accountantRoutes from './modules/reports/accountant.routes';
import businessSettingsRoutes from './modules/business-settings/business-settings.routes';
import auditRoutes from './modules/audit/audit.routes';
import flagsRoutes from './modules/feature-flags/feature-flags.routes';
import bookingsRoutes from './modules/bookings/bookings.routes';
import reviewsRoutes from './modules/reviews/reviews.routes';
import waitlistRoutes from './modules/waitlist/waitlist.routes';
import photosRoutes from './modules/photos/photos.routes';
import pushRoutes from './modules/push/push.routes';
import marketingRoutes from './modules/marketing/marketing.routes';
import { requireAuth, requireRole } from './middleware/auth';

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow non-browser requests (no origin) like Postman/curl
        if (!origin) return cb(null, true);
        const allowed = env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
        // Wildcard
        if (allowed.includes('*')) return cb(null, true);
        // Exact match
        if (allowed.includes(origin)) return cb(null, true);
        // Allow all *.vercel.app subdomains (preview deploys + project URLs)
        try {
          const host = new URL(origin).hostname;
          if (host.endsWith('.vercel.app')) return cb(null, true);
        } catch { /* ignore */ }
        cb(new Error(`CORS blocked: ${origin}`));
      },
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(pinoHttp({ logger }));
  app.use(generalLimiter);

  app.get('/health', (_req, res) =>
    res.json({ status: 'ok', uptime: process.uptime(), env: env.NODE_ENV }),
  );

  app.get('/openapi.json', (_req, res) => res.json(openapiSpec));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, { customSiteTitle: 'BarBar API' }));

  const api = express.Router();
  api.use('/auth', authRoutes);
  api.use('/services', servicesRoutes);
  api.use('/employees', employeesRoutes);
  api.use('/customers', customerQuickRoutes);
  api.use('/customers', customersRoutes);
  api.use('/working-hours', workingHoursRoutes);
  api.use('/time-off', timeOffRoutes);
  api.use('/availability', availabilityRoutes);
  api.use('/slots', slotsRoutes);
  api.use('/appointments', appointmentsRoutes);
  api.use('/guest-booking', guestRoutes);
  api.use('/payments', paymentsRoutes);
  api.use('/reports/accountant', accountantRoutes);
  api.use('/reports', reportsRoutes);
  api.use('/business-settings', businessSettingsRoutes);
  api.use('/audit-logs', auditRoutes);
  api.use('/feature-flags', flagsRoutes);
  api.use('/bookings', bookingsRoutes);
  api.use('/reviews', reviewsRoutes);
  api.use('/waitlist', waitlistRoutes);
  api.use('/push', pushRoutes);
  api.use('/marketing', marketingRoutes);
  api.get('/qr-info', requireAuth, requireRole('ADMIN'), (_req, res) => {
    res.json({
      bookingUrl: env.PUBLIC_URL.replace(/\/$/, '') + '/book',
      businessName: env.BUSINESS_NAME,
    });
  });
  api.use('/', photosRoutes);
  app.use(env.API_PREFIX, api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
