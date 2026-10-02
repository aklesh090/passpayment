# 🔍 Rangilo Raas 2.0 — Final Audit Report

> **Audit Date:** 2026-10-02 | **Verdict: Production-ready after applied fixes.**

---

## 1. What Was Tested

- All 7 controllers, 7 route files, middleware chains
- Auth JWT verification + admin guard
- Error handler (production information leakage check)
- Payment flow: order creation → verify → webhook → ticket generation
- Idempotency: `ticketsGenerated` flag, `stockRolledBack` flag, atomic MongoDB ops
- Webhook: signature verification, event handlers, race condition guards
- All 5 Mongoose models: User, Order, Ticket, PassType, PasswordResetOTP
- OTP flow: generation, hashing, attempt limiting, TTL expiry
- PDF service, email service, QR token generation
- Rate limiting, CORS, Helmet headers
- Environment variable validation
- Frontend routing (public, protected, admin)
- AuthContext, Checkout flow, Ticket PDF download, Admin scanner
- **Frontend build: ✅ PASSED** | **Backend startup: ✅ PASSED**

---

## 2. Issues Found & Fixed

### 🔴 CRITICAL — Fixed

#### BUG-01: PDF Download Always Produced Zero-Byte Files
- **File:** [`ticket.service.js`](file:///e:/aklesh/rangiloraas/client/src/services/ticket.service.js)
- **Cause:** The `api.js` Axios interceptor auto-unwraps `response.data`. For blob responses `response` IS the blob, so `response.data` was `undefined` — creating an empty file.
- **Fix:** Replaced Axios with native `fetch()` (bypasses interceptor), adds HTTP error check before blob conversion.

#### BUG-02: OTP Brute-Force on `/api/auth/verify-otp`
- **File:** [`auth.controller.js`](file:///e:/aklesh/rangiloraas/server/src/controllers/auth.controller.js)
- **Cause:** `verifyOTP` tracked attempts in DB but never checked them. Unlimited guesses at a 6-digit OTP.
- **Fix:** Added `if (otpRecord.attempts >= 5) → 429` at top of handler (matches `resetPassword` guard).

#### BUG-03: `Math.random()` OTP Generation (Not Cryptographically Secure)
- **File:** [`helpers.js`](file:///e:/aklesh/rangiloraas/server/src/utils/helpers.js)
- **Cause:** `Math.floor(100000 + Math.random() * 900000)` — pseudo-RNG, predictable.
- **Fix:** `crypto.randomInt(100000, 1000000)` — OS-backed CSPRNG.

### 🟠 HIGH — Fixed

#### BUG-04: Weak Guessable JWT Secrets in `.env`
- **File:** [`server/.env`](file:///e:/aklesh/rangiloraas/server/.env)
- **Cause:** `JWT_SECRET=rangiloraas-jwt-secret-key-2026-production-grade` — human-readable, forgeable.
- **Fix:** Replaced with `CHANGE_ME_USE_openssl_rand_-hex_64` placeholder with generation instructions.

#### BUG-05: Wrong Password Field in Auth Middleware
- **File:** [`auth.middleware.js`](file:///e:/aklesh/rangiloraas/server/src/middleware/auth.middleware.js)
- **Cause:** `.select('-password')` — field is `passwordHash`. Hash was never excluded.
- **Fix:** `.select('-passwordHash')`.

#### BUG-06: Admin Dashboard Revenue Always $0
- **File:** [`admin.controller.js`](file:///e:/aklesh/rangiloraas/server/src/controllers/admin.controller.js)
- **Cause:** `item.price` doesn't exist in schema — field is `item.unitPrice`. All revenue computed as `NaN → 0`.
- **Fix:** Changed `item.price` → `item.unitPrice`.

### 🟡 MEDIUM — Fixed

#### BUG-07: Checkout Hardcoded Razorpay Key Fallback
- **File:** [`Checkout.jsx`](file:///e:/aklesh/rangiloraas/client/src/pages/user/Checkout.jsx)
- **Cause:** `VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder'` — if env var not set, Razorpay rejected every payment.
- **Fix:** Use `razorpayKeyId` from server's order response (already sent correctly by backend).

### 📋 Configuration — Fixed

| Item | Fix |
|------|-----|
| `.gitignore` missing `*.env`, test PDFs | Added comprehensive patterns |
| No `client/.env.example` | Created with architecture notes |
| No `README.md` | Created with all required sections |

---

## 3. Verified SECURE (No Issues)

| Area | Status |
|------|--------|
| Price authority (server-only) | ✅ SECURE |
| Frontend cannot mark order paid | ✅ SECURE |
| Razorpay HMAC signature verification | ✅ SECURE |
| Webhook authenticity check | ✅ SECURE |
| Webhook idempotency | ✅ SECURE |
| Duplicate ticket prevention | ✅ SECURE |
| Ticket IDOR protection | ✅ SECURE |
| PDF download authorization | ✅ SECURE |
| Admin route protection | ✅ SECURE |
| JWT: access in header, refresh in HttpOnly cookie | ✅ SECURE |
| Password hashing (bcrypt cost=12) | ✅ SECURE |
| Stock reservation race condition | ✅ SECURE |
| CORS whitelist | ✅ SECURE |
| Prod 500 error masking | ✅ SECURE |
| QR token entropy (256-bit) | ✅ SECURE |
| OTP TTL (10 min MongoDB TTL index) | ✅ SECURE |
| Rate limiting (auth: 20/15min) | ✅ CONFIGURED |
| Raw body for webhook BEFORE JSON parser | ✅ CORRECT |
| Helmet security headers | ✅ ACTIVE |

---

## 4. Remaining Known Issues (Non-Blocking)

| ID | Sev | Issue | Recommendation |
|----|-----|-------|----------------|
| REM-01 | Low | Duplicate webhook URLs `/api/webhooks/razorpay` + `/api/payments/webhook` | Configure Razorpay Dashboard to only use `/api/payments/webhook`; remove legacy route after migration |
| REM-02 | Low | No refresh token revocation on logout | Stolen refresh tokens valid for 7 days. Add Redis token blacklist if high security required |
| REM-03 | Info | No payment confirmation email to buyer | Add `sendConfirmationEmail()` call after `generateTicketsForOrder()` succeeds |

---

## 5. Production Environment Variables

```env
# server/.env (production)
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/rangiloraas?retryWrites=true&w=majority

# Generate with: openssl rand -hex 64
JWT_SECRET=<64-byte-hex>
JWT_REFRESH_SECRET=<different-64-byte-hex>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Razorpay LIVE keys
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=<live-secret>
RAZORPAY_WEBHOOK_SECRET=<webhook-secret-matching-dashboard>

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=<16-char-gmail-app-password>

# CORS
CLIENT_URL=https://rangiloraas.yourdomain.com
```

> **Client has no required env vars.** Razorpay key is served by the backend per-order.

---

## 6. Deployment Steps

### Backend (Railway / Render / Heroku)
1. Set all env vars from Section 5 in platform dashboard
2. Start command: `node src/server.js`
3. Configure Razorpay webhook URL: `https://api.yourdomain.com/api/payments/webhook`
4. Verify: `GET https://api.yourdomain.com/api/health` returns `200`

### Frontend (Vercel)
1. Deploy `client/` directory to Vercel
2. Add a rewrite rule: `/api/*` → `https://api.yourdomain.com/api/:splat`
3. No client env vars needed

---

## 7. Final Launch Checklist

#### Security
- [ ] JWT secrets are 64+ random bytes (`openssl rand -hex 64`)
- [ ] `.env` not in git history
- [ ] Live Razorpay keys (`rzp_live_*` prefix)
- [ ] Webhook secret matches Razorpay Dashboard
- [ ] CORS `CLIENT_URL` is production URL (not localhost)
- [ ] `NODE_ENV=production`

#### Infrastructure
- [ ] HTTPS on both frontend and backend
- [ ] MongoDB Atlas with production cluster
- [ ] IP whitelist on Atlas

#### Functional
- [ ] End-to-end: register → browse → checkout → pay → ticket → PDF download
- [ ] Admin login works + all admin routes accessible
- [ ] QR scanner check-in marks ticket as used
- [ ] Forgot password OTP email arrives

#### Monitoring
- [ ] `GET /api/health` returns 200
- [ ] Error logging (Sentry or equivalent) connected
