# 🚀 מדריך העלאה ל-Production

## ארכיטקטורה מומלצת

```
┌─────────────────────┐         ┌──────────────────────┐
│   Vercel (Frontend) │ ──────► │ Render/Railway (API) │
│   Next.js · PWA     │         │ Express + Socket.IO  │
└─────────────────────┘         └──────────┬───────────┘
                                           │
                          ┌────────────────┼─────────────────┐
                          ▼                                  ▼
                ┌───────────────────┐              ┌───────────────────┐
                │ Supabase Postgres │              │ Upstash Redis     │
                │ DB · Storage      │              │ Cache · Locks     │
                └───────────────────┘              └───────────────────┘
```

**עלות חודשית משוערת**: 0$ עד 5,000 משתמשים פעילים — כל השירותים יש tier חינם.

---

## 📋 שלב 1: Supabase (Postgres)

1. הירשם ב-[supabase.com](https://supabase.com) → צור פרויקט חדש (Free tier)
2. תפריט **Project Settings → Database** → העתק את `Connection string · URI`
3. דוגמה: `postgresql://postgres.xxxxx:[PASSWORD]@aws-...supabase.com:6543/postgres`

### עדכון Prisma schema

ערוך `backend/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"     // היה "sqlite"
  url      = env("DATABASE_URL")
}
```

### יצירת migration חדש ל-Postgres

```bash
cd backend
rm -rf prisma/migrations          # מוחק migrations של SQLite
rm -f prisma/dev.db dev.db
# הגדר DATABASE_URL=postgresql://... ב-.env
npx prisma migrate dev --name init
npx prisma db seed                # → מ-seed.ts
npx prisma db execute --file prisma/seed-holidays.ts   # אופציונלי
```

---

## 📋 שלב 2: Upstash (Redis)

1. הירשם ב-[upstash.com](https://upstash.com) → Create Database (Free tier · 10K commands/day)
2. בחר אזור הקרוב (eu-central-1)
3. העתק את **TLS Redis URL**: `rediss://default:[TOKEN]@xxxxx.upstash.io:6379`

### החזרת ה-Redis האמיתי

חזור על `backend/src/lib/redis.ts` לגרסה המקורית:

```ts
import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

redis.on('connect', () => logger.info('✅ Redis connected'));
// ... acquireLock / releaseLock / cacheGet / cacheSet / cacheInvalidate
```

(הקוד המקורי שמור ב-Git history.)

ב-`backend/src/middleware/rateLimit.ts` הוסף `RedisStore`:

```ts
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../lib/redis';

store: new RedisStore({
  sendCommand: (...args) => redis.call(...args) as any,
}),
```

---

## 📋 שלב 3: Backend ל-Render

[render.com](https://render.com) → **New → Web Service**

| הגדרה | ערך |
|---|---|
| Root Directory | `backend` |
| Build Command | `npm install && npx prisma generate && npm run build` |
| Start Command | `npx prisma migrate deploy && node dist/index.js` |
| Health Check Path | `/health` |
| Instance | Free (לבדיקות) / Starter $7 (production) |

### Environment Variables ב-Render

```env
NODE_ENV=production
PORT=10000
API_PREFIX=/api/v1
DATABASE_URL=postgresql://postgres.xxx@aws...supabase.com:6543/postgres
REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379
JWT_ACCESS_SECRET=<openssl rand -hex 32>
JWT_REFRESH_SECRET=<openssl rand -hex 32>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=https://barabargil.vercel.app
LOG_LEVEL=info
PAYMENT_PROVIDER=mock
BUSINESS_NAME=בר אברג׳יל Hair Design
BUSINESS_PHONE=972500000001
BUSINESS_TIMEZONE=Asia/Jerusalem
BUSINESS_ADDRESS=בניין העיגולים, אילת
```

> Render נותן URL כמו `https://barabargil-api.onrender.com`. רשום אותו.

---

## 📋 שלב 4: Frontend ל-Vercel

[vercel.com](https://vercel.com) → **Add New → Project** → חבר את הריפו

| הגדרה | ערך |
|---|---|
| Framework | Next.js (אוטומטית) |
| Root Directory | `frontend` |
| Build Command | (ברירת מחדל) |
| Output | `.next` |

### Environment Variables ב-Vercel

```env
NEXT_PUBLIC_API_URL=https://barabargil-api.onrender.com
NEXT_PUBLIC_SOCKET_URL=https://barabargil-api.onrender.com
NEXT_PUBLIC_BUSINESS_NAME=בר אברג׳יל
```

> Vercel יתן domain כמו `barabargil.vercel.app`. אחר כך אפשר לחבר דומיין מותאם.

---

## 📋 שלב 5: עדכון CORS_ORIGIN ב-Render

חזור ל-Render → ערוך משתנה `CORS_ORIGIN` להיות **בדיוק** ה-URL של Vercel:

```
CORS_ORIGIN=https://barabargil.vercel.app
```

(או רשימה מופרדת בפסיקים אם יש כמה דומיינים)

---

## 📋 שלב 6: בדיקות אחרי דפלוי

- [ ] `https://barabargil.vercel.app` נטען
- [ ] `https://barabargil-api.onrender.com/health` → `{"status":"ok"}`
- [ ] `https://barabargil-api.onrender.com/docs` → Swagger UI
- [ ] התחברות עם bar@barabargil.local פועלת (אחרי seed)
- [ ] הזמנת תור אורח עובדת
- [ ] WebSocket מתחבר (פתח DevTools → Network → WS)
- [ ] PWA — אפשר להתקין מהדפדפן

---

## 🌐 דומיין מותאם

1. קנה דומיין (Cloudflare/GoDaddy/etc) → `barabargil.co.il`
2. ב-Vercel → Settings → Domains → הוסף `barabargil.co.il`
3. עקוב אחרי ההוראות (DNS records)
4. עדכן `CORS_ORIGIN` ב-Render ל-`https://barabargil.co.il`

---

## 📦 העברה למחשב אחר

```bash
# במחשב הישן
cd C:\Users\elira\Desktop\barbar
git init                                  # אם עוד אין git
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<user>/barabargil.git
git push -u origin main

# במחשב החדש
git clone https://github.com/<user>/barabargil.git
cd barabargil
npm install
cp backend/.env.example backend/.env       # מלא ערכים אמיתיים
cp frontend/.env.example frontend/.env.local
```

> **⚠️ אל תעלה ל-git**: `.env`, `node_modules/`, `dev.db`, `frontend/.next/`. הם כבר ב-`.gitignore`.

---

## 🆘 פתרון בעיות נפוצות

| בעיה | פתרון |
|---|---|
| `PrismaClientInitializationError` | DATABASE_URL לא נכון או לא הרצת `prisma migrate deploy` |
| `CORS error` | CORS_ORIGIN ב-Render לא תואם בדיוק ל-URL של Vercel |
| WebSocket לא מתחבר | בדוק שה-`NEXT_PUBLIC_SOCKET_URL` הוא https (לא http) |
| Render Free instance "Cold start" 30s | זה רגיל ב-Free. שדרג ל-Starter ($7) למשתמש מקצועי |
| הלוגו תמונה קטנה | החלף `frontend/public/logo.jpg` לתמונה ברזולוציה גבוהה |

---

## 💰 עלות חודשית משוערת

| שירות | Free | Production |
|---|---|---|
| Vercel | ✅ עד 100GB transfer | $20 |
| Render | ✅ 750h/חודש (Cold start) | $7 |
| Supabase | ✅ 500MB DB + 50K MAU | $25 |
| Upstash Redis | ✅ 10K commands/day | $0.20 per 100K |
| **סה״כ** | **$0** | **~$52** |

ל-Production אמיתי של מספרה — $52 לחודש זה זול מאוד עבור מערכת ניהול מלאה.

---

## Push Notifications setup

The app uses the standard Web Push protocol (VAPID). One-time setup:

### 1. Generate VAPID keys (locally, once)

```bash
npx web-push generate-vapid-keys
```

You'll get two base64url strings: a public key and a private key. Keep these — the private key is a secret.

### 2. Backend env vars (Railway)

Add three variables to the backend service:

| Key | Value |
|-----|-------|
| `VAPID_PUBLIC_KEY` | the generated public key |
| `VAPID_PRIVATE_KEY` | the generated private key (keep secret) |
| `VAPID_SUBJECT` | `mailto:bar@example.com` (a contact email or https URL) |

If any of these is missing the backend logs a warning at startup and gracefully no-ops on all push sends — nothing else breaks.

### 3. Frontend env var (Vercel)

Add to the frontend project:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | **same value as `VAPID_PUBLIC_KEY` above** |

(The current frontend reads the key from `GET /api/v1/push/vapid-public-key`, so this is optional but useful as a fallback / for offline builds.)

### 4. Enable notifications in the browser

After redeploy:

1. Admin or barber logs in and opens the dashboard / calendar.
2. Clicks the **🔔 הפעל התראות** button (top right of the page).
3. Browser asks for permission → click "Allow".
4. Done. From now on:
   - Every new appointment triggers an instant push to all ADMIN + BARBER users.
   - Every 30 minutes a reminder job scans for appointments 23–25 hours away and sends a single push with a wa.me link to send the customer a WhatsApp reminder.

### Notes

- The service worker (`/sw.js`) handles `push` and `notificationclick` events — clicking a notification focuses an existing tab or opens the URL in the payload.
- Subscriptions are stored per-user in the `PushSubscription` table. Dead endpoints (HTTP 410 from the push service) are deleted automatically.
- Reminders are dedup-safe via the `Appointment.reminderSentAt` column — each appointment is reminded at most once.
