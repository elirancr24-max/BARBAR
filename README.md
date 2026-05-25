# 💈 BarBar — מערכת ניהול תורים מקצועית למספרה

מערכת SaaS מלאה לניהול תורים, לקוחות, ספרים ושירותים — בעברית מלאה עם תמיכת RTL, Dark Mode, יומן Drag & Drop, עדכונים בזמן אמת, ועיצוב מינימליסטי-יוקרתי.

---

## ✨ מאפיינים עיקריים

- 🔐 **Authentication** — JWT (Bearer + Cookie dual-mode) עם Refresh Tokens
- 📅 **יומן מתקדם** — FullCalendar עם Drag & Drop, תצוגות יום/שבוע/חודש
- ⚡ **Real-time** — Socket.IO לעדכונים מיידיים בין מנהל/ספרים/לקוחות
- 🔒 **Appointment Locking** — מניעת תפיסה כפולה של אותו סלוט (Redis SET NX)
- 📊 **דשבורד ודוחות** — KPIs, גרפים, שעות עמוסות, הכנסות
- 📱 **Mobile-Ready API** — Bearer auth + OpenAPI 3 + Swagger UI
- 💬 **WhatsApp Notifications** — קישורי `wa.me` מוכנים להודעה (ללא צורך ב-API)
- 💳 **תשלומים** — Adapter pattern (Mock לפיתוח, Tranzila ל-Production)
- 📜 **Audit Logs** — היסטוריית פעולות מלאה (מי / מתי / מה השתנה)
- 🚩 **Feature Flags** — הפעלה/כיבוי פיצ'רים ללא deploy
- 🎨 **UI יוקרתי** — Dark Mode, RTL מלא, Tailwind + shadcn/ui

---

## 🛠️ Tech Stack

| שכבה | טכנולוגיה |
|---|---|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript |
| UI | Tailwind CSS + shadcn/ui + Radix UI + Framer Motion |
| Calendar | FullCalendar (RTL) |
| State | TanStack Query + Zustand |
| Backend | Node.js 20 + Express 4 + TypeScript |
| Real-time | Socket.IO 4 |
| Database | PostgreSQL 16 + Prisma 5 |
| Cache | Redis 7 (ioredis) |
| Auth | JWT + bcrypt |
| Validation | Zod |
| Logs | Pino |
| API Docs | Swagger / OpenAPI 3 |

---

## 📋 דרישות מוקדמות

| כלי | גרסה מינימלית | בדיקה |
|---|---|---|
| Node.js | 20.0.0 | `node -v` |
| npm | 10.0.0 | `npm -v` |
| Docker Desktop | 24+ | `docker --version` |
| Docker Compose | v2 (כלול ב-Desktop) | `docker compose version` |

> **Windows:** מומלץ להתקין [Docker Desktop](https://www.docker.com/products/docker-desktop/) ו-[Node.js LTS](https://nodejs.org/).

---

## 🚀 התקנה מהירה (One-Click)

```bash
# 1. שכפול ומעבר לתיקייה
cd barbar

# 2. העתקת קבצי הסביבה
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 3. התקנת תלויות + העלאת DB + Migrations + Seed
npm run setup

# 4. הרצת השרת + הקליינט במקביל
npm run dev
```

לאחר מכן:
- 🌐 **Frontend:** http://localhost:3000
- 🔌 **Backend API:** http://localhost:4000
- 📚 **Swagger Docs:** http://localhost:4000/docs
- 🗄️ **pgAdmin:** http://localhost:5050 — `admin@barbar.local` / `admin`
- 🧰 **Redis Commander:** http://localhost:8081

---

## 👥 משתמשי דוגמה (לאחר Seed)

| תפקיד | אימייל | סיסמה |
|---|---|---|
| מנהל | `admin@barbar.local` | `Admin1234!` |
| ספר #1 | `barber1@barbar.local` | `Barber1234!` |
| ספר #2 | `barber2@barbar.local` | `Barber1234!` |
| לקוח | `customer@barbar.local` | `Customer1234!` |

---

## 📜 פקודות npm זמינות

| פקודה | תיאור |
|---|---|
| `npm run setup` | התקנה מלאה (תלויות + DB + Migrations + Seed) |
| `npm run dev` | הרצת Backend (4000) + Frontend (3000) במקביל |
| `npm run dev:api` | רק Backend |
| `npm run dev:web` | רק Frontend |
| `npm run docker:up` | הפעלת Postgres + Redis + pgAdmin |
| `npm run docker:down` | עצירת containers |
| `npm run db:migrate` | הרצת Prisma migrations |
| `npm run db:seed` | טעינת נתוני דוגמה |
| `npm run db:studio` | פתיחת Prisma Studio (GUI ל-DB) |
| `npm run db:reset` | איפוס מלא של ה-DB |
| `npm run build` | בניית Production builds |
| `npm run lint` | בדיקת ESLint |
| `npm run test` | הרצת בדיקות |

---

## 📁 מבנה הפרויקט

```
barbar/
├── docker-compose.yml      # Postgres + Redis + GUIs
├── package.json            # Workspaces + Scripts
├── backend/                # Express API + Prisma + Socket.IO
│   ├── prisma/             # Schema + migrations + seed
│   └── src/
│       ├── modules/        # Feature-based (auth, appointments, ...)
│       ├── middleware/
│       ├── lib/            # prisma, redis, socket, logger
│       └── app.ts
└── frontend/               # Next.js 15 App Router
    └── src/
        ├── app/            # routes (public / admin / barber / customer)
        ├── components/     # UI + calendar + forms
        ├── lib/            # api client, auth, sockets
        └── hooks/
```

---

## 🔐 הרשאות משתמשים

| תפקיד | הרשאות |
|---|---|
| **ADMIN** | גישה מלאה — ניהול עובדים, שירותים, יומן כללי, דוחות, הגדרות, audit logs, feature flags |
| **BARBER** | יומן אישי, ניהול זמינות אישית, צפייה בלקוחות, אישור/דחיית תורים |
| **CUSTOMER** | קביעת תור, צפייה בתורים אישיים, ביטול/שינוי, פרופיל אישי |

---

## 🧪 בדיקות

```bash
npm run test                        # כל הבדיקות
npm --workspace backend run test    # רק backend
npm --workspace frontend run test   # רק frontend
```

---

## 🌍 פריסה (עתידי)

- **Frontend** → Vercel
- **Backend** → Render / Railway / Fly.io
- **Database** → Supabase / Neon
- **Redis** → Upstash

---

## 📄 רישיון

Private — © 2026
