# FinanceCmd — Personal Finance Tracker

A self-hosted personal finance tracker built for privacy. All sensitive financial data is encrypted at rest using AES-256-GCM. No third-party analytics, no data sold, no cloud dependency.

**Stack:** Bun · Express · TypeScript · Prisma · SQLite · React · Vite · Tailwind CSS

---

## Features

**Accounts & Transactions**
- Track checking, savings, credit cards, loans, investments, and income sources
- Import transactions from CSV exports (USAA, Navy Federal, Capital One, Citibank, Guideline, TSP)
- Automatic balance updates on every transaction create/update/delete

**Debt Management**
- Avalanche and snowball payoff strategies with month-by-month schedules
- Side-by-side strategy comparison showing total interest and months saved
- Extra monthly payment calculator

**Investment Projections**
- Compound growth calculator with Monte Carlo simulation (150 runs across 3 risk profiles)
- Conservative / moderate / aggressive scenario bands
- Save and revisit scenarios

**Dashboard & Reports**
- Net worth, savings rate, debt-to-income ratio
- Monthly income vs. expense trend (up to 5 years of history)
- Spending by category
- 90-day cash flow forecast using recurring transaction patterns
- Financial health score (0–100) with actionable recommendations

**Security**
- AES-256-GCM encryption for all PII fields at rest
- Session-based auth with bcrypt (cost 12), account lockout, CSRF protection
- HTTPS in development via self-signed certificates
- Audit log for all state-changing operations
- API key support with per-key read/write permissions

---

## Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| [Bun](https://bun.sh) | 1.3+ |
| [OpenSSL](https://openssl.org) | Any recent (for dev HTTPS certs) |

### 1. Clone

```bash
git clone https://github.com/your-username/budget-tracker.git
cd budget-tracker
```

### 2. Server setup

```bash
cd server
bun install

# Copy the example env and fill in your secrets
cp .env.example .env
# Edit .env — at minimum set SESSION_SECRET and ENCRYPTION_KEY (see below)

# Generate a strong SESSION_SECRET (run once):
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate a strong ENCRYPTION_KEY (run once):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Set up the database
bun run db:generate
bun run db:push

# (Optional) Seed demo data
bun run db:seed

# Generate HTTPS certificates for local dev
bun run scripts/generate-certs.ts

# Start the server
bun run dev
```

The server starts at:
- `https://localhost:3443` (HTTPS API)
- `http://localhost:3001` → redirects to HTTPS

### 3. Client setup

```bash
cd client
bun install
bun run dev
```

The client starts at `http://localhost:5173` and proxies all `/api` requests to the HTTPS backend.

> **Browser warning:** Your browser will show a certificate warning for the self-signed cert. Click **Advanced → Proceed to localhost** to continue. This only happens in development.

### 4. Log in

If you seeded the database:
- **Email:** `demo@example.com`
- **Password:** `Password1!`

---

## Environment Variables

See `server/.env.example` for a full reference. The two required secrets:

| Variable | Description |
|----------|-------------|
| `SESSION_SECRET` | Secret used to sign session cookies. Generate with `openssl rand -hex 64`. |
| `ENCRYPTION_KEY` | 64 hex characters (32 bytes) used for AES-256-GCM encryption of PII fields. Generate with `openssl rand -hex 32`. |

**The server refuses to start if `SESSION_SECRET` is not set.**

---

## Project Structure

```
budget-tracker/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── contexts/       # Auth context
│   │   ├── lib/api.ts      # Typed API client
│   │   └── pages/          # Route-level page components
│   └── vite.config.ts      # Dev server + proxy config
│
├── server/                 # Bun + Express backend
│   ├── certs/              # TLS certs (gitignored)
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   ├── scripts/
│   │   └── generate-certs.ts
│   └── src/
│       ├── index.ts        # App entry, middleware stack
│       ├── middleware/     # auth, CSRF, rate limiting, audit, API keys
│       ├── routes/         # One file per resource
│       ├── services/       # encryption, Plaid, financial calculations
│       └── providers/      # CSV parser + provider interface
│
└── docs/
    ├── OVERVIEW.md         # Architecture and design decisions
    ├── SECURITY.md         # Security architecture and hardening guide
    └── API.md              # API endpoint reference
```

---

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/OVERVIEW.md](docs/OVERVIEW.md) | Architecture, data flow, design decisions |
| [docs/SECURITY.md](docs/SECURITY.md) | Security model, encryption, hardening for production |
| [docs/API.md](docs/API.md) | Full API endpoint reference |

---

## Scripts

### Server

| Command | Description |
|---------|-------------|
| `bun run dev` | Start server with hot reload |
| `bun run start` | Start server (production) |
| `bun run db:generate` | Regenerate Prisma client |
| `bun run db:push` | Push schema changes to the database |
| `bun run db:studio` | Open Prisma Studio (database GUI) |
| `bun run db:seed` | Seed the database with demo data |
| `bun run scripts/generate-certs.ts` | Generate self-signed TLS certs for dev |

### Client

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Vite dev server with HMR |
| `bun run build` | Production build to `dist/` |
| `bun run preview` | Preview the production build locally |

---

## Production Deployment

1. Set `NODE_ENV=production` and `ENABLE_HTTPS=true` in `server/.env`
2. Use real TLS certificates (Let's Encrypt, etc.) — replace `certs/server.key` and `certs/server.cert`
3. Set `TRUST_PROXY=1` if running behind a reverse proxy (nginx, Caddy)
4. Build the client: `cd client && bun run build`
5. The server will serve the built client from `client/dist/` automatically

See [docs/SECURITY.md](docs/SECURITY.md) for the full production hardening checklist.

---

## License

MIT
