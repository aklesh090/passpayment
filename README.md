# 🎪 Rangilo Raas 2.0 — Garba & Dandiya Festival Ticketing

A full-stack event ticketing platform built with React + Vite (client) and Node.js + Express + MongoDB (server), with Razorpay payment integration, secure QR ticket generation, and an admin management panel.

---

## Architecture Overview

```
client/        → React + Vite + TailwindCSS frontend
server/        → Express.js REST API
  src/
    config/    → env, db, razorpay initialization
    controllers/
    middleware/
    models/    → Mongoose schemas
    routes/
    services/  → payment, ticket, email, PDF
    utils/
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- MongoDB 6+ (local) or MongoDB Atlas connection string
- Git

### 1. Clone & Install

```bash
git clone <repo-url>
cd rangiloraas

# Server
cd server && npm install

# Client
cd ../client && npm install
```

### 2. MongoDB Setup

**Local MongoDB:**
```bash
# Install MongoDB Community: https://www.mongodb.com/try/download/community
# Start it:
mongod --dbpath /data/db
```

**MongoDB Atlas (recommended for production):**
1. Create a free cluster at https://cloud.mongodb.com
2. Create a database user
3. Whitelist your IP (or use 0.0.0.0/0 for dev)
4. Copy the connection string (SRV format)

### 3. Configure Server Environment

```bash
cd server
cp .env.example .env    # Then edit .env with real values
```



### 4. Seed Database (Admin + Pass Types)

```bash
cd server
node src/seeds/seed.js   # Creates default pass types
node src/seeds/admin.js  # Creates admin user (see seeds dir for credentials)
```

### 5. Run Development Servers

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

Frontend: http://localhost:5173  
Backend API: http://localhost:5000/api/health

---

## Razorpay Setup (Test Mode)

1. Create account at https://dashboard.razorpay.com
2. Go to **Settings → API Keys** → Generate Test Key
3. Copy **Key ID** (starts with `rzp_test_`) and **Key Secret**
4. Add them to `server/.env`
5. For webhooks, add **Razorpay Webhook Secret** too

**Test Mode Cards:**
- Success: `4111 1111 1111 1111`, any future date, any CVV
- Failure: `4000 0000 0000 0002`

---

## Webhook Setup

Razorpay sends payment events to your server. For local dev, use ngrok:

```bash
# Install ngrok: https://ngrok.com
ngrok http 5000

# Copy the HTTPS URL, e.g.: https://abc123.ngrok.io
```

In Razorpay Dashboard → Settings → Webhooks:
- URL: `https://abc123.ngrok.io/api/payments/webhook`
- Events to subscribe: `payment.captured`, `payment.failed`, `order.paid`, `refund.created`
- Webhook Secret: set this and copy to `RAZORPAY_WEBHOOK_SECRET` in `.env`

---

## SMTP Setup (Forgot Password OTP)

Uses Gmail with App Password (NOT your Gmail login password):

1. Enable 2FA on your Google account
2. Go to: https://myaccount.google.com/apppasswords
3. Create an App Password for "Mail"
4. Copy the 16-character password to `SMTP_PASSWORD` in `.env`

If SMTP is not configured, OTPs are logged to console in development.

---

## Admin Setup

After seeding, log in with admin credentials (check `server/src/seeds/`).

To manually promote a user to admin:
```javascript
// In MongoDB shell or Compass:
db.users.updateOne({ email: "admin@example.com" }, { $set: { role: "admin" } })
```

Admin routes:
- Dashboard: `/admin/dashboard`
- QR Scanner: `/admin/scanner`
- Orders: `/admin/orders`
- Tickets: `/admin/tickets`
- Users: `/admin/users`

---

## Frontend Deployment

### Vercel (recommended)

```bash
cd client
npm run build
# Deploy dist/ to Vercel
```

Or via Vercel CLI:
```bash
npx vercel --cwd client
```

**Environment:** No client env vars needed. The Vite proxy handles `/api` → backend in dev. In production, configure a rewrite rule in your host to forward `/api/*` to your backend URL.

---

## Backend Deployment

### Railway / Render / Heroku

1. Set all env vars from `server/.env.example` in the platform's dashboard
2. Set `NODE_ENV=production`
3. Deploy: the start command is `node src/server.js`

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/src ./src
EXPOSE 5000
CMD ["node", "src/server.js"]
```

---

## Production Checklist

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` generated with `openssl rand -hex 64` (never guessable)
- [ ] `JWT_REFRESH_SECRET` different from JWT_SECRET, also 64+ bytes
- [ ] `MONGODB_URI` points to Atlas (not localhost)
- [ ] Real Razorpay **live** keys (`rzp_live_*`)
- [ ] `RAZORPAY_WEBHOOK_SECRET` set and matches Razorpay Dashboard
- [ ] `CLIENT_URL` set to production frontend URL (CORS)
- [ ] SMTP configured with real App Password
- [ ] `.env` is in `.gitignore` and NOT committed
- [ ] MongoDB Atlas IP whitelist configured
- [ ] HTTPS enabled on all endpoints
- [ ] Rate limiting is active (already configured: 20 req/15min on auth)
- [ ] Webhook endpoint accessible from Razorpay's servers

---

## Security Architecture

| Area | Implementation |
|------|---------------|
| Price authority | Backend-only — DB price always used |
| Payment verification | HMAC-SHA256 via official Razorpay SDK |
| Webhook authenticity | Signature verification before any processing |
| Idempotency | Atomic `findOneAndUpdate` with state guards |
| Duplicate tickets | `ticketsGenerated` flag + unique index on `ticketId` |
| JWT | Access token (15m) + HttpOnly refresh token (7d cookie) |
| Password hashing | bcrypt, cost factor 12 |
| OTP | 6-digit CSPRNG (`crypto.randomInt`), bcrypt-hashed, 10-min TTL, max 5 attempts |
| QR tokens | 32-byte cryptographic random (`crypto.randomBytes(32)`) |
| Authorization | Owner-check on every ticket/order access |
| Admin protection | `verifyJWT` + `requireAdmin` on all admin routes |
| CORS | Whitelist: only `CLIENT_URL` allowed |

---

## API Reference

### Auth
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | None | Register new user |
| POST | `/api/auth/login` | None | Login |
| POST | `/api/auth/refresh` | Cookie | Refresh access token |
| POST | `/api/auth/logout` | None | Clear refresh token cookie |
| GET | `/api/auth/me` | JWT | Current user profile |
| POST | `/api/auth/forgot-password` | None | Send OTP email |
| POST | `/api/auth/verify-otp` | None | Verify OTP (max 5 attempts) |
| POST | `/api/auth/reset-password` | None | Reset password with OTP |

### Orders
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/orders` | JWT | Create order + Razorpay order |
| GET | `/api/orders` | JWT | My orders |
| GET | `/api/orders/:id` | JWT | Single order |
| POST | `/api/payments/verify` | JWT | Verify payment + generate tickets |

### Tickets
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/tickets` | JWT | My tickets |
| GET | `/api/tickets/:id` | JWT | Single ticket (own only) |
| GET | `/api/tickets/:id/download` | JWT | Download PDF pass (own only) |

### Admin
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/admin/dashboard` | Admin | Stats + charts |
| GET | `/api/admin/orders` | Admin | All orders |
| GET | `/api/admin/users` | Admin | All users |
| GET | `/api/admin/tickets` | Admin | All tickets |
| POST | `/api/admin/verify-ticket` | Admin | QR scan + check-in |
| PATCH | `/api/admin/tickets/:id/cancel` | Admin | Cancel ticket |

### Webhook
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/payments/webhook` | Razorpay sig | Payment events |
