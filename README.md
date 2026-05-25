# 💈 בר אברג׳יל · Hair Design

מערכת ניהול תורים מקצועית למספרת בר אברג'יל באילת — Next.js PWA + Express + Socket.IO.

📍 בניין העיגולים, אילת · ⏰ א׳-ה׳ 10:00-20:00

---

## ✨ פיצ'רים

### ללקוח (ציבורי, ללא הרשמה)
- 🎯 הזמנת תור ב-4 שלבים — שירות → ספר → תאריך/שעה → פרטים
- ⏱️ נעילת סלוט 2 דקות (Redis SET NX EX)
- 📱 PWA — להתקין לאייפון/אנדרואיד כאפליקציה
- 🌙 Dark Mode · RTL מלא · עברית
- 📞 לחיצה על טלפון = חיוג · 📍 מיקום = Google Maps

### ספרים (בר · ישי · עידן)
- 📅 יומן יומי עם **timeline + רשימה** + Drag&Drop
- ➕ **Walk-in** — יצירת תור ידנית עם autocomplete לקוחות קיימים
- ✋ **Check-in** — סימון "הלקוח הגיע" עם נקודה ירוקה פועמת
- 💰 **רישום תשלום מהיר** — מזומן/אשראי/ביט + טיפ
- 🔄 **רה-בוקינג** — "אותו דבר עוד 4 שבועות" בקליק
- 🗓️ **חופשות וחסימות** — הפסקה שעה / יום שלם / שבוע

### אדמין (בר — הבעלים)
- 📊 **דשבורד** — KPIs, תור הבא עם countdown, ימי הולדת השבוע
- 👤 **פרופיל לקוח** — היסטוריה, תיוגים, יום הולדת, סה"כ הוציא
- 💼 **דוח סוף יום** — פילוח לפי ספר + אמצעי תשלום, ייצוא CSV/Print
- 👥 ניהול ספרים · שירותים · לקוחות
- 🚩 Feature Flags · 📜 Audit Logs · 📚 Swagger API
- 🕎 **חגי ישראל אוטומטיים** — 21 חגים ב-2026-2027

---

## 🛠️ Tech Stack

| שכבה | טכנולוגיה |
|---|---|
| Frontend | Next.js 15 · React 19 · TypeScript · Tailwind · shadcn/ui · Framer Motion |
| State | TanStack Query · Zustand |
| Real-time | Socket.IO 4 |
| Backend | Node.js 20 · Express 4 · TypeScript · Prisma 5 |
| DB | **SQLite** (local) / **PostgreSQL** (prod — Supabase) |
| Cache | **In-memory** (local) / **Redis** (prod — Upstash) |
| Auth | JWT (Bearer + Cookie dual-mode) · bcrypt |
| Validation | Zod (משותף client+server) |
| Logs | Pino + pino-pretty |
| API Docs | OpenAPI 3 / Swagger UI |

---

## 🚀 הרצה מקומית (One-Click)

```bash
# 1. Clone
git clone <repo-url>
cd barbar

# 2. Environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 3. Install + migrate + seed
npm install
cd backend && npx prisma migrate dev --name init && npx tsx prisma/seed.ts && npx tsx prisma/seed-holidays.ts && cd ..

# 4. Run dev (backend :4000 + frontend :3000)
npm run dev
```

לאחר מכן:
- 🌐 **Frontend**: http://localhost:3000
- 🔌 **API**: http://localhost:4000/api/v1
- 📚 **Swagger**: http://localhost:4000/docs
- 🗄️ **Prisma Studio**: `npm run db:studio` → http://localhost:5555

---

## 👥 משתמשי דוגמה

| תפקיד | אימייל | סיסמה |
|---|---|---|
| בעלים + אדמין | `bar@barabargil.local` | `Admin1234!` |
| ספר | `yishai@barabargil.local` | `Barber1234!` |
| ספר | `idan@barabargil.local` | `Barber1234!` |
| לקוח דמו | `customer@barabargil.local` | `Customer1234!` |

---

## 📦 פריסה לפרודקשן

ראה **[`DEPLOY.md`](./DEPLOY.md)** — מדריך מקיף עם:
- Vercel (Frontend)
- Render / Railway (Backend Express + Socket.IO)
- Supabase (PostgreSQL DB)
- Upstash (Redis Cache + Locks)

**TL;DR**:
```bash
# 1. Push to GitHub
gh repo create barabargil --private --source=. --push

# 2. Render (Backend) — click "New Blueprint" → connect repo (render.yaml included)

# 3. Vercel (Frontend) — click "New Project" → Root Directory = frontend

# 4. Set env vars: DATABASE_URL (Supabase), REDIS_URL (Upstash), CORS_ORIGIN (Vercel URL)
```

עלות חודשית: **$0** (Free tiers) → **~$52** (Production ללא cold start).

---

## 📁 מבנה הפרויקט

```
barbar/
├── DEPLOY.md                  # מדריך פרודקשן מקיף
├── AUDIT.md                   # פערים מנקודת מבט ספר מקצועי
├── render.yaml                # Render Blueprint
├── docker-compose.yml         # Postgres+Redis local (אופציונלי)
│
├── backend/                   # Express API + Prisma + Socket.IO
│   ├── prisma/
│   │   ├── schema.prisma      # SQLite local → Postgres prod (אוטומטי)
│   │   ├── seed.ts            # admin + 3 barbers + services
│   │   └── seed-holidays.ts   # חגי ישראל
│   ├── scripts/
│   │   └── prepare-prod.js    # מחליף provider בבילד
│   └── src/
│       ├── modules/           # auth · appointments · payments · reports · ...
│       └── lib/               # redis (dual-mode) · prisma · socket · jwt
│
└── frontend/                  # Next.js PWA
    ├── vercel.json
    ├── public/
    │   ├── logo.jpg
    │   ├── manifest.webmanifest
    │   └── sw.js
    └── src/
        ├── app/
        │   ├── page.tsx                  # Landing
        │   ├── book/                     # Booking wizard
        │   ├── admin/                    # דשבורד · יומן · לקוחות · דוחות · חופשות
        │   ├── barber/                   # יומן אישי · זמינות · חופשות
        │   └── my/                       # התורים שלי
        └── components/
            ├── calendar/                 # DayCalendar · NewAppointmentDialog · PaymentDialog
            ├── time-off/
            ├── dashboard/                # NextAppointment · BirthdaysWidget · TodaySchedule
            └── brand/                    # BrandMark · PhotoMark
```

---

## 🔐 אבטחה

- bcrypt rounds=12 · JWT HS256 (Access 15min + Refresh 7d)
- httpOnly + Secure + SameSite=Lax cookies
- Rate limit: auth 20/min, general 200/min
- Helmet: CSP, HSTS, X-Frame-Options
- Zod validation על כל קלט · Prisma מונע SQL injection
- Audit Logs על כל פעולה רגישה
- Redis SET NX EX לנעילת סלוטים (מניעת תפיסה כפולה)
- אין `.env` ב-git

---

## 📜 רישיון

MIT — ראה [`LICENSE`](./LICENSE)

---

🤖 Built with ❤️ and Claude Code
