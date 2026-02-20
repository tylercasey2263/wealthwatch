# Server

Bun + Express + TypeScript backend for FinanceCmd.

## Setup

```bash
bun install
cp .env.example .env
# Fill in SESSION_SECRET and ENCRYPTION_KEY in .env
```

Generate secrets:
```bash
# SESSION_SECRET
openssl rand -hex 64

# ENCRYPTION_KEY
openssl rand -hex 32
```

## Database

```bash
bun run db:generate   # Regenerate Prisma client (run after schema changes)
bun run db:push       # Apply schema to database
bun run db:seed       # Load demo data (demo@example.com / Password1!)
bun run db:studio     # Open Prisma Studio at http://localhost:5555
```

## HTTPS Certificates (development)

```bash
bun run scripts/generate-certs.ts
```

Requires `openssl` on PATH. Generates `certs/server.key` and `certs/server.cert` (gitignored).

## Running

```bash
bun run dev     # Hot reload (development)
bun run start   # Production
```

## Environment Variables

See `.env.example` for full documentation. Required variables:

| Variable | Description |
|----------|-------------|
| `SESSION_SECRET` | Secret for signing session cookies. Server exits if unset. |
| `ENCRYPTION_KEY` | 64 hex chars (32 bytes) for AES-256-GCM field encryption. |
| `DATABASE_URL` | SQLite path. Default: `file:./prisma/dev.db` |

## API Routes

| Prefix | Description |
|--------|-------------|
| `POST /api/auth/login` | Login |
| `POST /api/auth/register` | Register |
| `GET /api/accounts` | List accounts |
| `GET /api/transactions` | List transactions (paginated) |
| `GET /api/debts` | List debts |
| `GET /api/investments` | List investments |
| `GET /api/budgets` | List budgets |
| `GET /api/dashboard/summary` | Net worth + monthly summary |
| `POST /api/projections/debt-payoff` | Debt payoff schedule |
| `POST /api/projections/investment-growth` | Investment projection + Monte Carlo |
| `POST /api/import/csv` | Import transactions from CSV |
| `GET /api/api-keys` | List API keys |
| `GET /api/admin/audit-log` | View audit log |

See [../docs/API.md](../docs/API.md) for the full reference.
