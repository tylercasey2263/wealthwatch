# Architecture Overview

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│                                                             │
│   React SPA (Vite · TypeScript · Tailwind · Recharts)       │
│   http://localhost:5173 (dev)                               │
└───────────────────────┬─────────────────────────────────────┘
                        │  /api/* (proxied in dev)
                        │  HTTPS (direct in production)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Express Server (Bun)                      │
│                   https://localhost:3443                    │
│                                                             │
│  Middleware stack (in order):                               │
│  1. Request ID (X-Request-ID header)                        │
│  2. Helmet (CSP, HSTS, X-Frame-Options, etc.)              │
│  3. Additional security headers                             │
│  4. Compression                                             │
│  5. CORS                                                    │
│  6. Body parsing (JSON, urlencoded — 5MB limit)             │
│  7. Input sanitization (XSS prevention)                     │
│  8. Global rate limiter (200 req/min/IP)                    │
│  9. Session management (express-session)                    │
│  10. Prisma client injection                                │
│  11. API key auth (falls through to session if absent)      │
│  12. CSRF protection                                        │
│  13. Audit logging                                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                     SQLite Database                         │
│                   (via Prisma ORM)                          │
│                   server/prisma/dev.db                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Request Lifecycle

### Authenticated browser request (e.g., GET /api/accounts)

```
Browser
  → sends session cookie + X-CSRF-Token header
  → Express middleware stack runs top to bottom
  → apiKeyAuth: no X-API-Key header → falls through
  → csrfProtection: GET method → skips validation, refreshes token in response header
  → requireAuth: checks req.session.userId → passes
  → accounts route handler: queries Prisma (WHERE userId = session.userId)
  → decrypts encrypted fields
  → returns JSON
```

### API key request (e.g., from a script)

```
Script
  → sends X-API-Key: fincmd_xxx header
  → apiKeyAuth: hashes key (HMAC-SHA256), looks up keyHash in DB
  → validates isActive, not expired, has permission for method
  → sets req.session.userId from key's owner
  → csrfProtection: sees X-API-Key header → skips CSRF check
  → route handler runs normally
```

### Login flow (session fixation prevention)

```
POST /api/auth/login
  → validate credentials
  → bcrypt.compare(password, hash)
  → accountLockout.clearAttempts(email)
  → req.session.regenerate()       ← new session ID issued
  → req.session.userId = user.id
  → new CSRF token generated in session
  → X-CSRF-Token sent in response header
  → client captures token, uses it for subsequent requests
```

---

## Project Structure

```
budget-tracker/
│
├── README.md
├── .gitignore
├── docs/
│   ├── OVERVIEW.md         ← this file
│   ├── SECURITY.md
│   └── API.md
│
├── client/
│   ├── index.html
│   ├── vite.config.ts      # Dev proxy: /api → https://localhost:3443
│   ├── tsconfig.app.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx          # Router setup
│       ├── index.css
│       ├── assets/
│       ├── components/
│       │   ├── Layout.tsx
│       │   └── ui/          # shadcn-style components (button, card, input, etc.)
│       ├── contexts/
│       │   └── AuthContext.tsx   # useAuth hook, login/logout/register
│       ├── lib/
│       │   ├── api.ts            # Typed fetch wrapper + all API calls
│       │   └── utils.ts
│       └── pages/
│           ├── Login.tsx
│           ├── Register.tsx
│           ├── Dashboard.tsx
│           ├── Accounts.tsx
│           ├── Transactions.tsx
│           ├── Debts.tsx
│           ├── Investments.tsx
│           ├── Budgets.tsx
│           ├── Import.tsx
│           ├── Reports.tsx
│           ├── Settings.tsx       # Password change, API keys, security status
│           └── Docs.tsx
│
└── server/
    ├── index.ts                   # Re-exports from src/index.ts
    ├── package.json
    ├── tsconfig.json
    ├── .env                       # Local secrets (gitignored)
    ├── .env.example               # Template committed to repo
    ├── certs/                     # TLS certs (gitignored)
    │   ├── server.key
    │   └── server.cert
    ├── scripts/
    │   └── generate-certs.ts      # openssl wrapper for dev certs
    ├── prisma/
    │   ├── schema.prisma
    │   └── dev.db                 # SQLite database (gitignored)
    └── src/
        ├── index.ts               # App entry: middleware stack + server startup
        ├── seed.ts                # Demo data seeder
        │
        ├── middleware/
        │   ├── auth.ts            # requireAuth — checks session.userId
        │   ├── security.ts        # CSRF, sanitizeInput, password policy, account lockout
        │   ├── rateLimiter.ts     # In-memory fixed-window rate limiter
        │   ├── audit.ts           # Audit log middleware + logLoginAttempt
        │   └── apiKeyAuth.ts      # API key auth + requireAuthOrApiKey
        │
        ├── routes/
        │   ├── auth.ts            # POST /login, /register, /logout, /change-password; GET /me
        │   ├── accounts.ts        # CRUD /accounts
        │   ├── transactions.ts    # CRUD /transactions (paginated, filtered)
        │   ├── debts.ts           # CRUD /debts
        │   ├── investments.ts     # CRUD /investments
        │   ├── budgets.ts         # CRUD /budgets
        │   ├── dashboard.ts       # GET summary, spending-by-category, monthly-trend, health-score, cash-flow-forecast
        │   ├── projections.ts     # POST debt-payoff, debt-compare, investment-growth; GET/POST scenarios
        │   ├── import.ts          # POST csv-preview, csv; GET providers
        │   ├── apiKeys.ts         # CRUD /api-keys
        │   ├── admin.ts           # GET audit-log, login-history, security-status
        │   └── plaid.ts           # GET status; POST link-token, exchange, sync; DELETE disconnect
        │
        ├── services/
        │   ├── encryption.ts      # AES-256-GCM encrypt/decrypt, HMAC hashApiKey, generateApiKey
        │   ├── debtPayoff.ts      # Avalanche/snowball calculator (pure functions)
        │   ├── financialHealth.ts # Health score calculator + cash flow forecaster
        │   └── plaid.ts           # Plaid API client (link token, exchange, accounts, transactions)
        │
        └── providers/
            └── IFinancialProvider.ts  # CSV parser + CSVMapping type + mapCSVToTransactions
```

---

## Database Schema

```
User
  ├── id (uuid)
  ├── email (unique)
  ├── passwordHash
  ├── firstName, lastName
  └── → Account[], Budget[], Scenario[], FinancialSnapshot[], ApiKey[]

Account
  ├── id, userId (FK → User)
  ├── name, institution (encrypted)
  ├── type: bank|credit_card|loan|investment|income
  ├── balance, creditLimit, interestRate, minimumPayment
  ├── accountNumber (encrypted, stored as ****XXXX on read)
  └── → Transaction[], Debt[], Investment[]

Transaction
  ├── id, accountId (FK → Account)
  ├── date, description (encrypted), amount
  ├── category, subcategory, type: income|expense|transfer
  └── isRecurring, notes (encrypted)

Debt
  ├── id, accountId (FK → Account)
  ├── name (encrypted)
  ├── originalBalance, currentBalance, interestRate, minimumPayment
  └── dueDate (day of month 1–31), startDate

Investment
  ├── id, accountId (FK → Account)
  ├── name (encrypted)
  ├── currentValue, costBasis, monthlyContribution, employerMatch, returnRate
  └── allocations (JSON string)

Budget          → userId, category, amount, period
Scenario        → userId, name/description/parameters/results (all encrypted)
FinancialSnapshot → userId, periodic net-worth snapshots

AuditLog        → userId, action, resource, resourceId, details, ipAddress, userAgent, status
LoginAttempt    → email, ipAddress, userAgent, success, reason

ApiKey
  ├── userId (FK → User)
  ├── keyHash (HMAC-SHA256 of raw key, keyed with ENCRYPTION_KEY)
  ├── keyPrefix (first 12 chars + "..." for display)
  ├── permissions: "read" | "write" | "read,write"
  └── lastUsedAt, expiresAt, isActive
```

---

## Encryption Model

All PII fields are encrypted using **AES-256-GCM** before being written to SQLite, and decrypted on read. The encryption is transparent to the rest of the application via `encrypt()` / `decrypt()` helpers in `services/encryption.ts`.

### What is encrypted

| Table | Encrypted fields |
|-------|-----------------|
| Account | `name`, `institution`, `accountNumber` |
| Transaction | `description`, `notes` |
| Debt | `name` |
| Investment | `name` |
| Scenario | `name`, `description`, `parameters`, `results` |

### Format

Encrypted values are stored as `iv:authTag:ciphertext` (all hex-encoded). The auth tag provides **authenticated encryption** — any tampering with stored values is detected at decrypt time.

### Key derivation

- If `ENCRYPTION_KEY` is exactly 64 hex characters (32 bytes), it is used directly.
- Otherwise it is treated as a passphrase and derived via PBKDF2-SHA256 (100,000 iterations).

### API key hashing

API keys are hashed with **HMAC-SHA256** keyed with `ENCRYPTION_KEY` before storage. Even with a full database dump, keys cannot be brute-forced without knowing the encryption key.

---

## Auth & Session Flow

```
                      ┌──────────────────────────────┐
                      │         Login/Register        │
                      │  POST /api/auth/login         │
                      └────────────┬─────────────────┘
                                   │ bcrypt.compare
                                   │ accountLockout check
                                   │ req.session.regenerate() ← prevents session fixation
                                   │ session.userId = user.id
                                   │ new CSRF token → X-CSRF-Token header
                                   ▼
                      ┌──────────────────────────────┐
                      │      Session Cookie           │
                      │  fincmd.sid (httpOnly,        │
                      │  sameSite: strict,            │
                      │  secure in production)        │
                      └──────────────────────────────┘
                                   │
                      Every subsequent request:
                      session cookie + X-CSRF-Token header
                                   │
                      ┌────────────▼─────────────────┐
                      │      requireAuth middleware   │
                      │  checks session.userId        │
                      │  → 401 if missing             │
                      └──────────────────────────────┘
```

**Session lifetime:** 8 hours
**Lockout policy:** 5 failed attempts → 15-minute lockout
**Rate limit on auth endpoints:** 10 attempts per 15 minutes per IP+email

---

## Financial Calculations

All financial math is implemented as pure functions in `services/`:

### Debt Payoff (`debtPayoff.ts`)
- Implements both **avalanche** (highest rate first) and **snowball** (lowest balance first) strategies
- Month-by-month simulation up to 360 months (30 years)
- Extra monthly payment applied to the top-priority debt each month
- Freed minimums from paid-off debts roll into the extra budget

### Investment Growth (`projections.ts`)
- Deterministic compound growth: `balance = balance * (1 + monthlyRate) + monthlyContribution`
- **Monte Carlo simulation:** 50 runs × 3 risk profiles (conservative/moderate/aggressive)
- Percentiles: 10th (pessimistic), 50th (median), 90th (optimistic)

### Financial Health Score (`financialHealth.ts`)
Weighted 100-point score across 5 dimensions:

| Component | Weight | Target |
|-----------|--------|--------|
| Savings rate | 20 pts | 20%+ |
| Debt-to-income | 20 pts | < 36% |
| Emergency fund | 20 pts | 6+ months |
| Investment rate | 20 pts | 15%+ of income |
| Credit utilization | 20 pts | < 30% |

### Cash Flow Forecast (`financialHealth.ts`)
Projects daily balance for up to 365 days by replaying recurring transactions on their historical day-of-month patterns.

---

## CSV Import

Supports any bank export with configurable column mapping:

```typescript
interface CSVMapping {
  dateColumn: string;
  descriptionColumn: string;
  amountColumn: string;
  categoryColumn?: string;
}
```

Limits: 5,000 rows per import, 2MB file size. All descriptions are encrypted on insert. Account balance is updated atomically after batch insert.

Built-in profiles for: USAA, Navy Federal, Capital One, Citibank, Guideline 401k, TSP.

---

## Key Design Decisions

**Why SQLite?**
Self-hosted personal finance. A single user doesn't need Postgres. SQLite is zero-maintenance, fast enough, and the entire database is a single file that's easy to back up.

**Why Bun?**
Drop-in replacement for Node with faster startup, native TypeScript, and built-in test runner.

**Why session-based auth instead of JWTs?**
Sessions can be invalidated server-side (logout, password change, lockout). JWTs cannot be revoked without additional infrastructure. For a self-hosted app, the session store overhead is negligible.

**Why encrypt at the application layer instead of SQLite encryption?**
SQLite encryption (SQLCipher, etc.) requires recompilation and tool support. Application-layer encryption with AES-GCM is portable, auditable, and doesn't require special DB drivers. It also allows field-level control over what's encrypted.

**Why not a monorepo tool (Turborepo, nx)?**
Unnecessary for a two-workspace project. Each workspace has its own `package.json` and can be built/run independently.
