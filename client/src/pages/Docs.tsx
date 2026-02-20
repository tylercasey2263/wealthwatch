import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { BookOpen, Code, Server, Shield, Plug, BarChart3, FileText, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react';

type Section = 'overview' | 'getting-started' | 'architecture' | 'api' | 'providers' | 'features' | 'security' | 'contributing';

const sections: { id: Section; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'getting-started', label: 'Getting Started', icon: HelpCircle },
  { id: 'architecture', label: 'Architecture', icon: Server },
  { id: 'api', label: 'API Reference', icon: Code },
  { id: 'providers', label: 'Adding Providers', icon: Plug },
  { id: 'features', label: 'Feature Guide', icon: BarChart3 },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'contributing', label: 'Contributing', icon: FileText },
];

export function Docs() {
  const [active, setActive] = useState<Section>('overview');

  return (
    <div className="space-y-6 print:space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Documentation</h1>
        <p className="text-[hsl(var(--muted-foreground))]">Built-in reference guide for FinanceCmd</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="space-y-1">
          {sections.map(s => {
            const Icon = s.icon;
            return (
              <button key={s.id} onClick={() => setActive(s.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors ${active === s.id ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]'}`}>
                <Icon className="h-4 w-4" />{s.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {active === 'overview' && <OverviewSection />}
          {active === 'getting-started' && <GettingStartedSection />}
          {active === 'architecture' && <ArchitectureSection />}
          {active === 'api' && <APISection />}
          {active === 'providers' && <ProvidersSection />}
          {active === 'features' && <FeaturesSection />}
          {active === 'security' && <SecuritySection />}
          {active === 'contributing' && <ContributingSection />}
        </div>
      </div>
    </div>
  );
}

function DocCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
      <CardContent className="prose prose-sm max-w-none space-y-3 text-sm leading-relaxed">{children}</CardContent>
    </Card>
  );
}

function CodeBlock({ children }: { children: string }) {
  return <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre">{children}</pre>;
}

function OverviewSection() {
  return (
    <div className="space-y-4">
      <DocCard title="FinanceCmd — Personal Finance Command Center">
        <p>FinanceCmd is a comprehensive personal finance application that gives you complete visibility into your financial life. Track accounts across multiple institutions, monitor spending, project investment growth, and plan debt payoff strategies — all in one place.</p>
        <h3 className="font-bold text-base mt-4">Key Features</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Multi-institution Dashboard</strong> — View all accounts (USAA, Navy Federal, Capital One, Citibank, etc.) in one unified view</li>
          <li><strong>Transaction Tracking</strong> — Categorize and search transactions with filters by account, category, type, and date range</li>
          <li><strong>Debt Payoff Calculator</strong> — Compare Avalanche vs Snowball strategies with interactive projections</li>
          <li><strong>Investment Projector</strong> — Model growth with Monte Carlo simulation across risk profiles</li>
          <li><strong>Financial Health Score</strong> — Composite 0–100 score based on savings rate, DTI, emergency fund, investments, and credit utilization</li>
          <li><strong>Cash Flow Forecasting</strong> — 30/60/90-day balance projection based on recurring transactions</li>
          <li><strong>CSV Import</strong> — Import transactions from any bank that provides CSV exports</li>
          <li><strong>Budget Tracking</strong> — Set and monitor category-based budgets with progress indicators</li>
        </ul>
        <h3 className="font-bold text-base mt-4">Tech Stack</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Frontend:</strong> React 19, TypeScript, Vite 7, Tailwind CSS 4, Recharts</li>
          <li><strong>Backend:</strong> Express 5, TypeScript, Prisma 5, SQLite</li>
          <li><strong>Runtime:</strong> Bun</li>
          <li><strong>Auth:</strong> Session-based with bcrypt password hashing</li>
        </ul>
      </DocCard>
    </div>
  );
}

function GettingStartedSection() {
  return (
    <div className="space-y-4">
      <DocCard title="Prerequisites">
        <ul className="list-disc pl-5 space-y-1">
          <li>Bun v1.0+ installed (<code className="bg-gray-100 px-1 rounded">curl -fsSL https://bun.sh/install | bash</code>)</li>
          <li>Git for version control</li>
        </ul>
      </DocCard>
      <DocCard title="Installation">
        <CodeBlock>{`# Clone the repository
git clone <repo-url>
cd budget_tracker

# Server setup
cd server
bun install
cp .env.example .env     # Edit with your settings
bunx prisma db push      # Create database
bun run src/seed.ts       # Seed demo data
bun run --watch src/index.ts  # Start server on :3001

# Client setup (new terminal)
cd client
bun install
bun run dev               # Start client on :5173`}</CodeBlock>
      </DocCard>
      <DocCard title="Demo Account">
        <p>After seeding, log in with:</p>
        <CodeBlock>{`Email: demo@example.com
Password: password123`}</CodeBlock>
        <p>The demo account includes sample accounts matching USAA, Navy Federal, Capital One, Citibank, Bridgecrest, Guideline 401k, TSP, and VA Disability with 3 months of transactions.</p>
      </DocCard>
    </div>
  );
}

function ArchitectureSection() {
  return (
    <div className="space-y-4">
      <DocCard title="System Architecture">
        <CodeBlock>{`┌─────────────────────────────────────────────────┐
│                   Client (React)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  Pages   │ │Components│ │  Context (Auth)  │ │
│  └────┬─────┘ └──────────┘ └────────┬─────────┘ │
│       │                             │            │
│  ┌────┴─────────────────────────────┴──────────┐ │
│  │           API Client (lib/api.ts)           │ │
│  └─────────────────────┬───────────────────────┘ │
└────────────────────────┼─────────────────────────┘
                         │ HTTP (Vite proxy :5173→:3001)
┌────────────────────────┼─────────────────────────┐
│                   Server (Express)               │
│  ┌─────────────────────┴───────────────────────┐ │
│  │            Routes (REST API)                │ │
│  │  auth│accounts│transactions│debts│budgets   │ │
│  │  investments│dashboard│projections│import    │ │
│  └──────┬──────────────────────┬───────────────┘ │
│  ┌──────┴──────┐    ┌─────────┴─────────┐       │
│  │  Services   │    │    Middleware      │       │
│  │ debtPayoff  │    │  requireAuth      │       │
│  │ healthScore │    │  session           │       │
│  │ cashFlow    │    │  prisma injection  │       │
│  └──────┬──────┘    └───────────────────┘       │
│  ┌──────┴──────┐                                 │
│  │ Prisma ORM  │──── SQLite (dev.db)            │
│  └─────────────┘                                 │
└─────────────────────────────────────────────────┘`}</CodeBlock>
      </DocCard>
      <DocCard title="Data Model">
        <CodeBlock>{`User
 ├── Account[] (bank, credit_card, loan, investment, income)
 │    ├── Transaction[] (income, expense, transfer)
 │    ├── Debt[] (linked to credit cards / loans)
 │    └── Investment[] (linked to investment accounts)
 ├── Budget[] (per-category spending limits)
 └── Scenario[] (saved what-if projections)`}</CodeBlock>
      </DocCard>
      <DocCard title="Key Design Decisions">
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>SQLite over Postgres:</strong> Simpler local development, single-file database, no daemon needed. Migrate to Postgres for production by changing the Prisma datasource.</li>
          <li><strong>Session auth over JWT:</strong> Simpler for server-rendered apps, avoids token refresh complexity, httpOnly cookies prevent XSS token theft.</li>
          <li><strong>Provider adapter pattern:</strong> IFinancialProvider interface allows adding new institution importers without modifying core code.</li>
          <li><strong>Compute-on-read for projections:</strong> Debt payoff and investment projections are calculated on each request rather than stored, ensuring they always reflect current data.</li>
        </ul>
      </DocCard>
    </div>
  );
}

function APISection() {
  const endpoints = [
    { method: 'POST', path: '/api/auth/register', desc: 'Create new user account' },
    { method: 'POST', path: '/api/auth/login', desc: 'Authenticate and create session' },
    { method: 'POST', path: '/api/auth/logout', desc: 'Destroy session' },
    { method: 'GET', path: '/api/auth/me', desc: 'Get current user' },
    { method: 'GET', path: '/api/accounts', desc: 'List all accounts' },
    { method: 'POST', path: '/api/accounts', desc: 'Create account' },
    { method: 'PUT', path: '/api/accounts/:id', desc: 'Update account' },
    { method: 'DELETE', path: '/api/accounts/:id', desc: 'Soft-delete account' },
    { method: 'GET', path: '/api/transactions', desc: 'List transactions (filterable)' },
    { method: 'POST', path: '/api/transactions', desc: 'Create transaction' },
    { method: 'PUT', path: '/api/transactions/:id', desc: 'Update transaction' },
    { method: 'DELETE', path: '/api/transactions/:id', desc: 'Delete transaction' },
    { method: 'GET', path: '/api/debts', desc: 'List all debts' },
    { method: 'POST', path: '/api/debts', desc: 'Create debt' },
    { method: 'PUT', path: '/api/debts/:id', desc: 'Update debt' },
    { method: 'DELETE', path: '/api/debts/:id', desc: 'Delete debt' },
    { method: 'GET', path: '/api/investments', desc: 'List investments' },
    { method: 'POST', path: '/api/investments', desc: 'Create investment' },
    { method: 'PUT', path: '/api/investments/:id', desc: 'Update investment' },
    { method: 'DELETE', path: '/api/investments/:id', desc: 'Delete investment' },
    { method: 'GET', path: '/api/budgets', desc: 'List budgets' },
    { method: 'POST', path: '/api/budgets', desc: 'Create budget' },
    { method: 'PUT', path: '/api/budgets/:id', desc: 'Update budget' },
    { method: 'DELETE', path: '/api/budgets/:id', desc: 'Delete budget' },
    { method: 'GET', path: '/api/dashboard/summary', desc: 'Financial overview stats' },
    { method: 'GET', path: '/api/dashboard/spending-by-category', desc: 'Category breakdown' },
    { method: 'GET', path: '/api/dashboard/monthly-trend', desc: '6-month income/expense trend' },
    { method: 'GET', path: '/api/dashboard/health-score', desc: 'Financial health score (0-100)' },
    { method: 'GET', path: '/api/dashboard/cash-flow-forecast', desc: 'Projected balance over N days' },
    { method: 'POST', path: '/api/projections/debt-payoff', desc: 'Calculate payoff schedule' },
    { method: 'POST', path: '/api/projections/debt-compare', desc: 'Avalanche vs Snowball comparison' },
    { method: 'POST', path: '/api/projections/investment-growth', desc: 'Growth + Monte Carlo projection' },
    { method: 'POST', path: '/api/projections/scenario-save', desc: 'Save projection scenario' },
    { method: 'GET', path: '/api/projections/scenarios', desc: 'List saved scenarios' },
    { method: 'POST', path: '/api/import/csv-preview', desc: 'Preview CSV headers/data' },
    { method: 'POST', path: '/api/import/csv', desc: 'Import CSV transactions' },
    { method: 'GET', path: '/api/import/providers', desc: 'List supported providers' },
  ];

  const methodColor: Record<string, string> = {
    GET: 'bg-green-100 text-green-800',
    POST: 'bg-blue-100 text-blue-800',
    PUT: 'bg-yellow-100 text-yellow-800',
    DELETE: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-4">
      <DocCard title="API Reference">
        <p>All endpoints require authentication (session cookie) except <code className="bg-gray-100 px-1 rounded">/auth/register</code>, <code className="bg-gray-100 px-1 rounded">/auth/login</code>, and <code className="bg-gray-100 px-1 rounded">/api/health</code>.</p>
        <p>Request/response bodies use JSON. Errors return <code className="bg-gray-100 px-1 rounded">{`{ "error": "message" }`}</code>.</p>
      </DocCard>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-[hsl(var(--muted))]">
                <th className="p-3 text-left w-20">Method</th>
                <th className="p-3 text-left">Endpoint</th>
                <th className="p-3 text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((ep, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-[hsl(var(--muted)/0.3)]">
                  <td className="p-3"><span className={`text-xs font-mono px-2 py-0.5 rounded ${methodColor[ep.method]}`}>{ep.method}</span></td>
                  <td className="p-3 font-mono text-xs">{ep.path}</td>
                  <td className="p-3 text-[hsl(var(--muted-foreground))]">{ep.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function ProvidersSection() {
  return (
    <div className="space-y-4">
      <DocCard title="Adding a New Financial Provider">
        <p>FinanceCmd uses a provider adapter pattern to support importing data from different financial institutions. Here's how to add a new provider:</p>

        <h3 className="font-bold text-base mt-4">Step 1: Define the Provider</h3>
        <p>Add your provider to the providers list in <code className="bg-gray-100 px-1 rounded">server/src/routes/import.ts</code>:</p>
        <CodeBlock>{`// In the providers array:
{ id: 'chase', name: 'Chase', type: 'bank', method: 'csv', status: 'available' }`}</CodeBlock>

        <h3 className="font-bold text-base mt-4">Step 2: Implement CSV Column Mapping</h3>
        <p>Different banks export CSVs with different column names. The mapping is handled during import — the user maps columns in the UI. For auto-detection, update the auto-detect logic in the Import page:</p>
        <CodeBlock>{`// client/src/pages/Import.tsx — handlePreview()
// Add patterns for your provider's column names:
if (lower.includes('trans_date')) autoMap.date = h;
if (lower.includes('merchant')) autoMap.description = h;`}</CodeBlock>

        <h3 className="font-bold text-base mt-4">Step 3: Custom Adapter (Optional)</h3>
        <p>For providers that need special parsing (e.g., negative amounts = credits), implement the IFinancialProvider interface:</p>
        <CodeBlock>{`// server/src/providers/ChaseAdapter.ts
import type { IFinancialProvider } from './IFinancialProvider.ts';

export class ChaseAdapter implements IFinancialProvider {
  id = 'chase';
  name = 'Chase';
  supportedAccountTypes = ['bank', 'credit_card'];

  parseCSV(content: string) {
    // Chase-specific CSV parsing logic
    // Handle their date format, amount sign conventions, etc.
  }

  mapTransaction(row: Record<string, string>) {
    return {
      date: row['Trans Date'],
      description: row['Description'],
      amount: parseFloat(row['Amount']),
      category: this.categorize(row['Description']),
      type: parseFloat(row['Amount']) > 0 ? 'income' : 'expense',
    };
  }

  private categorize(description: string): string {
    // Auto-categorization logic
    return 'Uncategorized';
  }
}`}</CodeBlock>

        <h3 className="font-bold text-base mt-4">Step 4: Register the Adapter</h3>
        <p>Import and register your adapter in the provider registry. The CSV import route will automatically use it when the user selects the matching provider.</p>
      </DocCard>

      <DocCard title="Supported Institutions">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b"><th className="p-2 text-left">Institution</th><th className="p-2 text-left">Type</th><th className="p-2 text-left">Method</th><th className="p-2 text-left">Notes</th></tr>
          </thead>
          <tbody className="divide-y">
            <tr><td className="p-2">USAA</td><td className="p-2">Bank</td><td className="p-2">CSV</td><td className="p-2">Checking & Savings</td></tr>
            <tr><td className="p-2">Navy Federal</td><td className="p-2">Bank</td><td className="p-2">CSV</td><td className="p-2">Checking & Savings</td></tr>
            <tr><td className="p-2">Capital One</td><td className="p-2">Credit Card</td><td className="p-2">CSV</td><td className="p-2">All card types</td></tr>
            <tr><td className="p-2">Citibank</td><td className="p-2">Credit Card</td><td className="p-2">CSV</td><td className="p-2">All card types</td></tr>
            <tr><td className="p-2">Bridgecrest</td><td className="p-2">Loan</td><td className="p-2">Manual</td><td className="p-2">Auto loan</td></tr>
            <tr><td className="p-2">Guideline</td><td className="p-2">Investment</td><td className="p-2">CSV</td><td className="p-2">401k</td></tr>
            <tr><td className="p-2">TSP</td><td className="p-2">Investment</td><td className="p-2">CSV</td><td className="p-2">Federal 401k</td></tr>
            <tr><td className="p-2">VA</td><td className="p-2">Income</td><td className="p-2">Manual</td><td className="p-2">Disability payment</td></tr>
            <tr><td className="p-2 text-gray-400">Plaid</td><td className="p-2 text-gray-400">All</td><td className="p-2 text-gray-400">API</td><td className="p-2 text-gray-400">Coming soon</td></tr>
          </tbody>
        </table>
      </DocCard>
    </div>
  );
}

function FeaturesSection() {
  const [open, setOpen] = useState<string | null>('dashboard');

  const features = [
    { id: 'dashboard', title: 'Dashboard', content: 'The Dashboard provides a real-time overview of your financial life. It shows 6 key metrics (net worth, monthly income/expenses, savings rate, total debt, investments) plus interactive charts for income vs expenses, spending by category (pie chart), and monthly savings trend. Data updates automatically when you add accounts or transactions.' },
    { id: 'accounts', title: 'Accounts', content: 'Manage all your financial accounts in one place. Each account has a type (bank, credit card, loan, investment, income), institution, and balance. Accounts are color-coded by type. Adding transactions automatically updates the account balance. Deleting an account performs a soft-delete (isActive=false) to preserve transaction history.' },
    { id: 'transactions', title: 'Transactions', content: 'The transactions page supports filtering by account, category, type (income/expense/transfer), and free-text search. You can add transactions manually or import via CSV. Each transaction has a date, description, amount, category, and optional notes. Marking a transaction as "recurring" enables it to be included in cash flow forecasting.' },
    { id: 'debts', title: 'Debt Payoff Calculator', content: 'The debt tracker shows all debts with progress bars (original vs current balance). The Payoff Calculator lets you set an extra monthly payment amount and compare Avalanche (highest interest first) vs Snowball (lowest balance first) strategies side-by-side. An interactive chart shows how your total balance decreases over time, and a timeline shows when each debt is paid off.' },
    { id: 'investments', title: 'Investment Projector', content: 'View all investments with current values and monthly contributions. The Growth Projector models compound growth with adjustable parameters (starting balance, monthly contribution, return rate, years). It includes Monte Carlo simulation running 50 scenarios each at conservative (5%), moderate (8%), and aggressive (11%) return rates, giving you a range of possible outcomes.' },
    { id: 'budgets', title: 'Budget Tracking', content: 'Set spending limits by category (Food, Transportation, Housing, etc.) with monthly or weekly periods. Progress bars show current spending vs budget with color indicators: green (<75%), yellow (75-100%), and red (over budget). Spending is automatically tracked from your categorized transactions.' },
    { id: 'health', title: 'Financial Health Score', content: 'A composite score from 0-100 based on 5 equally-weighted components (20 points each): Savings Rate (target: 20%+), Debt-to-Income ratio (target: <36%), Emergency Fund (target: 6+ months expenses), Investment Rate, and Credit Utilization (target: <30%). Includes letter grade (A-F) and personalized recommendations.' },
    { id: 'forecast', title: 'Cash Flow Forecast', content: 'Projects your bank balance forward 30, 60, or 90 days based on recurring income and expenses. Shows a line chart with $500 minimum balance reference line and alerts if your balance is projected to drop below that threshold. Lists all detected recurring transactions with their typical day-of-month.' },
  ];

  return (
    <div className="space-y-2">
      {features.map(f => (
        <Card key={f.id} className="cursor-pointer" onClick={() => setOpen(open === f.id ? null : f.id)}>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{f.title}</CardTitle>
              {open === f.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          </CardHeader>
          {open === f.id && <CardContent className="pt-0 text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{f.content}</CardContent>}
        </Card>
      ))}
    </div>
  );
}

function SecuritySection() {
  return (
    <DocCard title="Security">
      <h3 className="font-bold text-base">Authentication</h3>
      <ul className="list-disc pl-5 space-y-1">
        <li>Passwords hashed with bcrypt (10 rounds)</li>
        <li>Session-based auth with httpOnly, sameSite cookies</li>
        <li>Sessions expire after 24 hours</li>
        <li>Secure cookie flag enabled in production</li>
      </ul>

      <h3 className="font-bold text-base mt-4">Data Protection</h3>
      <ul className="list-disc pl-5 space-y-1">
        <li>All API routes (except auth) require authentication via <code className="bg-gray-100 px-1 rounded">requireAuth</code> middleware</li>
        <li>Every database query is scoped to the authenticated user's ID</li>
        <li>Account ownership verified before any mutation</li>
        <li>Input validation via express-validator on auth endpoints</li>
        <li>Helmet.js for HTTP security headers</li>
        <li>CORS restricted to configured origin</li>
      </ul>

      <h3 className="font-bold text-base mt-4">Production Recommendations</h3>
      <ul className="list-disc pl-5 space-y-1">
        <li>Set a strong <code className="bg-gray-100 px-1 rounded">SESSION_SECRET</code> environment variable</li>
        <li>Enable HTTPS and set <code className="bg-gray-100 px-1 rounded">NODE_ENV=production</code> for secure cookies</li>
        <li>Switch from SQLite to PostgreSQL for concurrent access</li>
        <li>Add rate limiting to auth endpoints</li>
        <li>Implement CSRF protection</li>
        <li>Use a session store (Redis) instead of in-memory</li>
      </ul>
    </DocCard>
  );
}

function ContributingSection() {
  return (
    <div className="space-y-4">
      <DocCard title="Project Structure">
        <CodeBlock>{`budget_tracker/
├── server/
│   ├── prisma/
│   │   └── schema.prisma        # Database schema
│   ├── src/
│   │   ├── index.ts             # Express app entry
│   │   ├── seed.ts              # Demo data seeder
│   │   ├── middleware/
│   │   │   └── auth.ts          # Session auth middleware
│   │   ├── routes/
│   │   │   ├── auth.ts          # Registration, login, logout
│   │   │   ├── accounts.ts      # Account CRUD
│   │   │   ├── transactions.ts  # Transaction CRUD + filters
│   │   │   ├── debts.ts         # Debt CRUD
│   │   │   ├── investments.ts   # Investment CRUD
│   │   │   ├── budgets.ts       # Budget CRUD
│   │   │   ├── dashboard.ts     # Summary, trends, health, forecast
│   │   │   ├── projections.ts   # Debt payoff, investment growth
│   │   │   └── import.ts        # CSV import + providers
│   │   ├── services/
│   │   │   ├── debtPayoff.ts    # Avalanche/snowball engine
│   │   │   └── financialHealth.ts # Health score + cash flow
│   │   └── providers/
│   │       └── IFinancialProvider.ts # Provider interface + CSV parser
│   └── package.json
├── client/
│   ├── src/
│   │   ├── main.tsx             # React entry
│   │   ├── App.tsx              # Router + auth wrapper
│   │   ├── index.css            # Tailwind + theme vars
│   │   ├── lib/
│   │   │   ├── api.ts           # Typed API client + interfaces
│   │   │   └── utils.ts         # Formatting helpers
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx   # Auth state management
│   │   ├── components/
│   │   │   ├── Layout.tsx       # Sidebar + responsive nav
│   │   │   └── ui/              # Reusable UI primitives
│   │   └── pages/
│   │       ├── Dashboard.tsx    # Overview charts
│   │       ├── Accounts.tsx     # Account management
│   │       ├── Transactions.tsx # Transaction list + filters
│   │       ├── Debts.tsx        # Debt tracker + calculator
│   │       ├── Investments.tsx  # Portfolio + projector
│   │       ├── Budgets.tsx      # Budget tracking
│   │       ├── Reports.tsx      # Health score + forecast
│   │       ├── Import.tsx       # CSV import wizard
│   │       └── Docs.tsx         # Built-in documentation
│   └── package.json
└── README.md`}</CodeBlock>
      </DocCard>
      <DocCard title="Development Workflow">
        <CodeBlock>{`# Start both server and client
cd server && bun run dev    # Port 3001 (auto-restarts)
cd client && bun run dev    # Port 5173 (hot reload)

# Database operations
cd server
bunx prisma db push         # Apply schema changes
bunx prisma studio          # Visual database browser
bun run src/seed.ts         # Re-seed demo data

# Production build
cd client && bun run build  # Output to dist/`}</CodeBlock>
      </DocCard>
    </div>
  );
}
