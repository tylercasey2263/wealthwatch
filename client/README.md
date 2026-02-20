# Client

React + Vite + TypeScript frontend for FinanceCmd.

## Setup

```bash
bun install
```

## Development

```bash
bun run dev
```

Starts at `http://localhost:5173`. All `/api` requests are proxied to `https://localhost:3443` (the backend). The proxy accepts the server's self-signed certificate automatically.

The server must be running first. See [../server/README.md](../server/README.md).

## Production build

```bash
bun run build
```

Output goes to `dist/`. The server automatically serves it when the `dist/` directory is present.

## Tech Stack

| Library | Purpose |
|---------|---------|
| React 19 | UI framework |
| React Router v7 | Client-side routing |
| Vite 7 | Build tool + dev server |
| Tailwind CSS v4 | Styling |
| Recharts | Charts (trend, pie, area) |
| Lucide React | Icons |

## Project Structure

```
src/
├── App.tsx              # Router + protected routes
├── main.tsx             # React root
├── index.css            # Tailwind base styles
├── contexts/
│   └── AuthContext.tsx  # useAuth() hook
├── lib/
│   ├── api.ts           # Typed API client (all endpoints)
│   └── utils.ts         # cn() helper
├── components/
│   ├── Layout.tsx       # Sidebar navigation
│   └── ui/              # Base components (button, card, input, badge, select)
└── pages/
    ├── Login.tsx
    ├── Register.tsx
    ├── Dashboard.tsx    # Net worth, health score, charts
    ├── Accounts.tsx
    ├── Transactions.tsx
    ├── Debts.tsx        # Debt list + payoff calculator
    ├── Investments.tsx  # Investment list + growth projections
    ├── Budgets.tsx
    ├── Import.tsx       # CSV import with column mapper
    ├── Reports.tsx      # Monthly trend, spending by category
    ├── Settings.tsx     # Password change, API keys, security status
    └── Docs.tsx         # In-app documentation
```

## API Client

All API calls go through `lib/api.ts`, which handles:
- Attaching session cookies (`credentials: 'include'`)
- Reading and re-sending the `X-CSRF-Token` header on every response/request
- Typed return values for every endpoint
