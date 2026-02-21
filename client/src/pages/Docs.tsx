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
        <p>FinanceCmd is a comprehensive personal finance application that gives you complete visibility into your financial life. Track accounts across multiple institutions, monitor spending, project investment growth, plan debt payoff, and set financial goals — all in one place.</p>
        <h3 className="font-bold text-base mt-4">Key Features</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Financial Story Dashboard</strong> — Narrative insight cards at the top of the dashboard tell you exactly where you stand: your next debt win, debt-free projection, savings rate vs the 20% benchmark, and emergency fund coverage</li>
          <li><strong>Multi-institution Dashboard</strong> — View all accounts (USAA, Navy Federal, Capital One, Citibank, etc.) in one unified view with 6 key metrics and interactive charts</li>
          <li><strong>Transaction Tracking</strong> — Categorize and search transactions with filters by account, category, type, and date range</li>
          <li><strong>Debt Action Plan</strong> — Clear "what to do this month" instructions: which debt to attack, how much to pay, and minimum-only debts — with a live extra-payment slider and month-by-month schedule</li>
          <li><strong>Budget Drill-Down with History</strong> — Navigate any past month with arrow controls, click a budget category to expand a 6-month spending trend chart and the full transaction list for that month</li>
          <li><strong>Goals &amp; Plan</strong> — Set financial milestones (debt-free date, savings targets, emergency fund, investment milestones) with progress bars and target date tracking; debt-free goals auto-fetch the projected payoff date; completing a goal fires a confetti celebration</li>
          <li><strong>Investment Projector</strong> — Model growth with Monte Carlo simulation across risk profiles</li>
          <li><strong>Financial Health Score</strong> — Composite 0–100 score based on savings rate, DTI, emergency fund, investments, and credit utilization</li>
          <li><strong>Cash Flow Forecasting</strong> — 30/60/90-day balance projection based on recurring transactions</li>
          <li><strong>CSV Import</strong> — Import transactions from any bank that provides CSV exports</li>
        </ul>
        <h3 className="font-bold text-base mt-4">Tech Stack</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Frontend:</strong> React 19, TypeScript, Vite 7, Tailwind CSS 4, Recharts</li>
          <li><strong>Backend:</strong> Express 5, TypeScript, Prisma 5, SQLite</li>
          <li><strong>Runtime:</strong> Bun</li>
          <li><strong>Auth:</strong> Session-based with bcrypt password hashing, CSRF protection</li>
          <li><strong>Encryption:</strong> AES-256-GCM for all PII fields at rest</li>
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
          <li>Bun v1.0+ installed (<code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">curl -fsSL https://bun.sh/install | bash</code>)</li>
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
bun run src/seed.ts      # Seed demo data
bun run --watch src/index.ts  # Start server on :3001

# Client setup (new terminal)
cd client
bun install
bun run dev              # Start client on :5173`}</CodeBlock>
      </DocCard>
      <DocCard title="Demo Account">
        <p>After seeding, log in with:</p>
        <CodeBlock>{`Email: demo@example.com
Password: password123`}</CodeBlock>
        <p>The demo account includes sample accounts matching USAA, Navy Federal, Capital One, Citibank, Bridgecrest, Guideline 401k, TSP, and VA Disability with 3 months of transactions, budgets, debts, and goals pre-configured.</p>
      </DocCard>
      <DocCard title="Environment Variables">
        <CodeBlock>{`# server/.env
DATABASE_URL="file:./dev.db"
SESSION_SECRET="your-strong-secret-here"   # Required — server exits if missing
ENCRYPTION_KEY="32-byte-hex-key"           # Required for PII encryption
NODE_ENV="development"
PORT=3001

# Optional
ENABLE_HTTPS=true          # Enable HTTPS mode (needs certs in server/certs/)
TRUST_PROXY=1              # Set if behind a reverse proxy
CORS_ORIGIN=http://localhost:5173`}</CodeBlock>
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
                         │ HTTP (Vite proxy → :3001)
┌────────────────────────┼─────────────────────────┐
│                   Server (Express)               │
│  ┌──────────────────────────────────────────────┐│
│  │  Middleware Stack                            ││
│  │  requestId → helmet → cors → session →       ││
│  │  apiKeyAuth → csrfProtection → auditLog      ││
│  └──────┬───────────────────────────────────────┘│
│  ┌──────┴──────────────────────────────────────┐ │
│  │            Routes (REST API)                │ │
│  │  auth │ accounts │ transactions │ debts     │ │
│  │  investments │ budgets │ goals │ dashboard  │ │
│  │  projections │ import │ admin │ plaid       │ │
│  └──────┬──────────────────────┬───────────────┘ │
│  ┌──────┴──────┐    ┌─────────┴─────────┐       │
│  │  Services   │    │    Middleware      │       │
│  │ debtPayoff  │    │  requireAuth      │       │
│  │ healthScore │    │  rateLimiter      │       │
│  │ encryption  │    │  audit            │       │
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
 │    ├── Debt[]        (currentBalance, interestRate, minimumPayment)
 │    └── Investment[]  (currentValue, monthlyContribution, returnRate)
 ├── Budget[]   (category, amount, period)
 ├── Goal[]     (type, targetAmount, currentAmount, targetDate)
 ├── Scenario[] (saved what-if projections)
 ├── ApiKey[]   (programmatic access)
 └── FinancialSnapshot[] (historical net worth snapshots)`}</CodeBlock>
        <h3 className="font-bold text-base mt-3">Goal Types</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">debt_free</code> — Tracks a target debt payoff date; auto-shows projected vs stretch goal dates</li>
          <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">savings</code> — Named savings target (vacation, down payment, etc.)</li>
          <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">emergency_fund</code> — Build X months of expenses</li>
          <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">investment</code> — Reach a portfolio value milestone</li>
          <li><code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">custom</code> — Any other target</li>
        </ul>
      </DocCard>
      <DocCard title="Key Design Decisions">
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>SQLite over Postgres:</strong> Simpler local development, single-file database, no daemon needed. Change the Prisma datasource URL to migrate to Postgres.</li>
          <li><strong>Session auth over JWT:</strong> httpOnly cookies prevent XSS token theft; simpler rotation on password change; no refresh token complexity.</li>
          <li><strong>Compute-on-read projections:</strong> Debt payoff and investment projections are calculated per request, so they always reflect current balances and rates.</li>
          <li><strong>AES-256-GCM encryption:</strong> All PII fields (account names, institutions, transaction descriptions, notes) are encrypted at rest. The ENCRYPTION_KEY env var is required.</li>
          <li><strong>Provider adapter pattern:</strong> IFinancialProvider interface allows adding new institution importers without modifying core code.</li>
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
    { method: 'GET',  path: '/api/auth/me', desc: 'Get current user' },
    { method: 'POST', path: '/api/auth/change-password', desc: 'Change password (regenerates session)' },
    { method: 'GET',  path: '/api/accounts', desc: 'List all accounts' },
    { method: 'POST', path: '/api/accounts', desc: 'Create account' },
    { method: 'PUT',  path: '/api/accounts/:id', desc: 'Update account' },
    { method: 'DELETE', path: '/api/accounts/:id', desc: 'Soft-delete account' },
    { method: 'GET',  path: '/api/transactions', desc: 'List transactions (category, startDate, endDate, type, limit, offset)' },
    { method: 'POST', path: '/api/transactions', desc: 'Create transaction + update account balance atomically' },
    { method: 'PUT',  path: '/api/transactions/:id', desc: 'Update transaction' },
    { method: 'DELETE', path: '/api/transactions/:id', desc: 'Delete transaction + revert balance' },
    { method: 'GET',  path: '/api/debts', desc: 'List all debts' },
    { method: 'POST', path: '/api/debts', desc: 'Create debt' },
    { method: 'PUT',  path: '/api/debts/:id', desc: 'Update debt' },
    { method: 'DELETE', path: '/api/debts/:id', desc: 'Delete debt' },
    { method: 'GET',  path: '/api/investments', desc: 'List investments' },
    { method: 'POST', path: '/api/investments', desc: 'Create investment' },
    { method: 'PUT',  path: '/api/investments/:id', desc: 'Update investment' },
    { method: 'DELETE', path: '/api/investments/:id', desc: 'Delete investment' },
    { method: 'GET',  path: '/api/budgets', desc: 'List budgets' },
    { method: 'POST', path: '/api/budgets', desc: 'Create budget' },
    { method: 'PUT',  path: '/api/budgets/:id', desc: 'Update budget' },
    { method: 'DELETE', path: '/api/budgets/:id', desc: 'Delete budget' },
    { method: 'GET',  path: '/api/goals', desc: 'List goals (ordered by targetDate)' },
    { method: 'POST', path: '/api/goals', desc: 'Create goal (title, type, targetAmount, currentAmount, targetDate, notes)' },
    { method: 'PUT',  path: '/api/goals/:id', desc: 'Update goal (any field including isCompleted)' },
    { method: 'DELETE', path: '/api/goals/:id', desc: 'Delete goal' },
    { method: 'GET',  path: '/api/dashboard/summary', desc: 'Financial overview stats' },
    { method: 'GET',  path: '/api/dashboard/spending-by-category', desc: 'Category breakdown (startDate, endDate)' },
    { method: 'GET',  path: '/api/dashboard/monthly-trend', desc: 'N-month income/expense trend' },
    { method: 'GET',  path: '/api/dashboard/health-score', desc: 'Financial health score (0–100)' },
    { method: 'GET',  path: '/api/dashboard/cash-flow-forecast', desc: 'Projected balance over N days' },
    { method: 'POST', path: '/api/projections/debt-payoff', desc: 'Calculate payoff schedule (strategy, extraMonthly)' },
    { method: 'POST', path: '/api/projections/debt-compare', desc: 'Avalanche vs Snowball comparison + debtPayoffOrder' },
    { method: 'POST', path: '/api/projections/investment-growth', desc: 'Growth + Monte Carlo projection' },
    { method: 'POST', path: '/api/projections/scenario-save', desc: 'Save projection scenario' },
    { method: 'GET',  path: '/api/projections/scenarios', desc: 'List saved scenarios' },
    { method: 'POST', path: '/api/import/csv-preview', desc: 'Preview CSV headers/data' },
    { method: 'POST', path: '/api/import/csv', desc: 'Import CSV transactions (max 5000 rows, 2MB)' },
    { method: 'GET',  path: '/api/import/providers', desc: 'List supported providers' },
    { method: 'GET',  path: '/api/api-keys', desc: 'List API keys' },
    { method: 'POST', path: '/api/api-keys', desc: 'Create API key' },
    { method: 'DELETE', path: '/api/api-keys/:id', desc: 'Revoke API key' },
    { method: 'GET',  path: '/api/admin/audit-log', desc: 'Audit log (admin)' },
    { method: 'GET',  path: '/api/admin/login-history', desc: 'Login attempt history' },
    { method: 'GET',  path: '/api/admin/security-status', desc: 'Security summary' },
    { method: 'GET',  path: '/api/health', desc: 'Health check (no auth required)' },
  ];

  const methodColor: Record<string, string> = {
    GET: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    POST: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    PUT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  };

  return (
    <div className="space-y-4">
      <DocCard title="API Reference">
        <p>All endpoints require authentication (session cookie) except <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">/auth/register</code>, <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">/auth/login</code>, and <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">/api/health</code>.</p>
        <p>All state-changing requests require a valid <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">X-CSRF-Token</code> header (token is returned in response headers after login).</p>
        <p>Errors return <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{`{ "error": "message" }`}</code> or <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{`{ "errors": [...] }`}</code> for validation failures.</p>
      </DocCard>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-[hsl(var(--muted))]">
                <th className="p-3 text-left w-20">Method</th>
                <th className="p-3 text-left">Endpoint</th>
                <th className="p-3 text-left hidden md:table-cell">Description</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((ep, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-[hsl(var(--muted)/0.3)]">
                  <td className="p-3"><span className={`text-xs font-mono px-2 py-0.5 rounded ${methodColor[ep.method]}`}>{ep.method}</span></td>
                  <td className="p-3 font-mono text-xs">{ep.path}</td>
                  <td className="p-3 text-[hsl(var(--muted-foreground))] hidden md:table-cell">{ep.desc}</td>
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
        <p>FinanceCmd uses a provider adapter pattern. Here's how to add a new institution:</p>

        <h3 className="font-bold text-base mt-4">Step 1: Define the Provider</h3>
        <p>Add your provider to the providers list in <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">server/src/routes/import.ts</code>:</p>
        <CodeBlock>{`{ id: 'chase', name: 'Chase', type: 'bank', method: 'csv', status: 'available' }`}</CodeBlock>

        <h3 className="font-bold text-base mt-4">Step 2: Auto-detect Columns</h3>
        <p>Add column name patterns to the auto-detect logic in <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">client/src/pages/Import.tsx</code>:</p>
        <CodeBlock>{`if (lower.includes('trans_date')) autoMap.date = h;
if (lower.includes('merchant'))  autoMap.description = h;`}</CodeBlock>

        <h3 className="font-bold text-base mt-4">Step 3: Custom Adapter (Optional)</h3>
        <CodeBlock>{`// server/src/providers/ChaseAdapter.ts
import type { IFinancialProvider } from './IFinancialProvider.ts';

export class ChaseAdapter implements IFinancialProvider {
  id = 'chase';
  name = 'Chase';

  mapTransaction(row: Record<string, string>) {
    return {
      date: row['Trans Date'],
      description: row['Description'],
      amount: parseFloat(row['Amount']),
      type: parseFloat(row['Amount']) > 0 ? 'income' : 'expense',
    };
  }
}`}</CodeBlock>
      </DocCard>

      <DocCard title="Supported Institutions">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b"><th className="p-2 text-left">Institution</th><th className="p-2 text-left">Type</th><th className="p-2 text-left">Method</th><th className="p-2 text-left">Notes</th></tr>
          </thead>
          <tbody className="divide-y">
            <tr><td className="p-2">USAA</td><td className="p-2">Bank</td><td className="p-2">CSV</td><td className="p-2">Checking &amp; Savings</td></tr>
            <tr><td className="p-2">Navy Federal</td><td className="p-2">Bank</td><td className="p-2">CSV</td><td className="p-2">Checking &amp; Savings</td></tr>
            <tr><td className="p-2">Capital One</td><td className="p-2">Credit Card</td><td className="p-2">CSV</td><td className="p-2">All card types</td></tr>
            <tr><td className="p-2">Citibank</td><td className="p-2">Credit Card</td><td className="p-2">CSV</td><td className="p-2">All card types</td></tr>
            <tr><td className="p-2">Bridgecrest</td><td className="p-2">Loan</td><td className="p-2">Manual</td><td className="p-2">Auto loan</td></tr>
            <tr><td className="p-2">Guideline</td><td className="p-2">Investment</td><td className="p-2">CSV</td><td className="p-2">401k</td></tr>
            <tr><td className="p-2">TSP</td><td className="p-2">Investment</td><td className="p-2">CSV</td><td className="p-2">Federal 401k</td></tr>
            <tr><td className="p-2">VA</td><td className="p-2">Income</td><td className="p-2">Manual</td><td className="p-2">Disability payment</td></tr>
          </tbody>
        </table>
      </DocCard>
    </div>
  );
}

function FeaturesSection() {
  const [open, setOpen] = useState<string | null>('dashboard');

  const features = [
    {
      id: 'dashboard',
      title: 'Dashboard & Financial Story',
      content: (
        <>
          <p>The Dashboard is split into two tiers. At the top, <strong>Your Financial Picture</strong> shows 2–4 narrative insight cards (only for sections where you have data):</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>🔥 Next Win</strong> — your smallest debt, estimated months to pay it off</li>
            <li><strong>📅 Debt Freedom</strong> — rough payoff timeline at minimums, with an example of how extra payments shorten it</li>
            <li><strong>💰 Savings Rate</strong> — your rate vs the recommended 20% benchmark with a plain-English verdict</li>
            <li><strong>🏦 Emergency Fund</strong> — months of expenses covered by current savings/investments</li>
          </ul>
          <p className="mt-2">Below the story cards, the existing 6 stat tiles (Net Worth, Monthly Income/Expenses, Savings Rate, Total Debt, Investments) and three charts remain: Income vs Expenses bar chart, Spending by Category pie chart, and Monthly Savings Trend.</p>
        </>
      ),
    },
    {
      id: 'accounts',
      title: 'Accounts',
      content: (
        <p>Manage all your financial accounts in one place. Each account has a type (bank, credit card, loan, investment, income), institution, and balance. Adding transactions automatically updates the account balance atomically. Deleting an account removes it and all associated transactions, debts, and investments.</p>
      ),
    },
    {
      id: 'transactions',
      title: 'Transactions',
      content: (
        <p>Filter by account, category, type (income/expense/transfer), date range, and free-text search. Import via CSV or add manually. Marking a transaction as "recurring" flags it for cash flow forecasting. All description and notes fields are encrypted at rest.</p>
      ),
    },
    {
      id: 'debts',
      title: 'Debt Action Plan',
      content: (
        <>
          <p>The Debt Tracker shows all debts with pay-off progress bars. Clicking <strong>Payoff Plan</strong> opens the Action Plan panel:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Extra payment slider</strong> — drag $0–$2,000/mo; the entire plan updates live</li>
            <li><strong>🎯 Attack this debt first</strong> — the highest-APR debt, showing minimum + extra = total this month</li>
            <li><strong>✅ Pay minimum only</strong> — all other debts with their minimum amounts listed</li>
            <li><strong>Summary row</strong> — debt-free date, total interest, and interest saved vs Snowball</li>
            <li><strong>Month-by-Month Schedule</strong> — collapsible table showing first 6 months of payments</li>
            <li><strong>Balance Over Time</strong> — collapsible chart comparing Avalanche and Snowball trajectories</li>
          </ul>
        </>
      ),
    },
    {
      id: 'budgets',
      title: 'Budgets with History',
      content: (
        <>
          <p>Set monthly spending limits by category. The page adds two layers of history navigation:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Month navigator</strong> — left/right arrows to step through any past month; all budget progress bars update for that month's actual spending. A "Today" button jumps back to the current month. Forward navigation is disabled to prevent viewing future months.</li>
            <li><strong>Drill-down panel</strong> — click any budget card to expand it. Shows a <strong>6-month trend bar chart</strong> (spend vs budget reference line) so you can see if last month was an anomaly or a pattern, plus a <strong>transaction list</strong> for the currently-viewed month.</li>
          </ul>
          <p className="mt-2">Spending data comes from <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">GET /api/dashboard/spending-by-category?startDate=&amp;endDate=</code> and <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">GET /api/transactions?category=&amp;startDate=&amp;endDate=</code> — no backend changes were needed to add this feature.</p>
        </>
      ),
    },
    {
      id: 'goals',
      title: 'Goals & Plan',
      content: (
        <>
          <p>Set and track financial milestones. Each goal has a type, optional target amount (with progress bar), optional target date, and notes.</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>💳 Debt-free Date</strong> — when you set the target date, the goal card shows both your projected payoff date (from the Avalanche calculation at $0 extra) and your stretch goal date side-by-side</li>
            <li><strong>🏦 Emergency Fund / 💰 Savings Target / 📈 Investment Milestone</strong> — progress bar from currentAmount to targetAmount</li>
            <li><strong>🎯 Custom</strong> — any other target with optional amount and date</li>
          </ul>
          <p className="mt-2">Click the circle icon to mark a goal complete — a confetti burst fires to celebrate. Completed goals move to a separate "Completed" section with a strikethrough title. Clicking the checkmark again moves the goal back to active. Edit or delete from the card action buttons.</p>
        </>
      ),
    },
    {
      id: 'investments',
      title: 'Investment Projector',
      content: (
        <p>View all investments with current values and monthly contributions. The Growth Projector models compound growth with adjustable parameters (starting balance, monthly contribution, return rate, years). Includes Monte Carlo simulation running 50 scenarios at conservative (5%), moderate (8%), and aggressive (11%) return rates, giving a realistic range of outcomes.</p>
      ),
    },
    {
      id: 'health',
      title: 'Financial Health Score',
      content: (
        <p>A composite score from 0–100 based on 5 equally-weighted components (20 points each): Savings Rate (target: 20%+), Debt-to-Income ratio (target: &lt;36%), Emergency Fund (target: 6+ months), Investment Rate, and Credit Utilization (target: &lt;30%). Includes letter grade (A–F) and personalized recommendations. Found under Reports.</p>
      ),
    },
    {
      id: 'forecast',
      title: 'Cash Flow Forecast',
      content: (
        <p>Projects your bank balance forward 30, 60, or 90 days based on recurring income and expenses. Shows a line chart with a $500 minimum-balance reference line. Alerts if your projected balance drops below that threshold. Lists all detected recurring transactions with their typical day-of-month. Found under Reports.</p>
      ),
    },
    {
      id: 'import',
      title: 'CSV Import',
      content: (
        <p>Upload any bank CSV export. The wizard previews the first 5 rows and auto-detects column mappings for common header names (date, description, amount). Map any undetected columns manually, then confirm the import. Limits: 5,000 rows and 2 MB per file. Imported transactions are batch-inserted and the account balance is updated atomically.</p>
      ),
    },
  ];

  return (
    <div className="space-y-2">
      {features.map(f => (
        <Card key={f.id} className="cursor-pointer" onClick={() => setOpen(open === f.id ? null : f.id)}>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{f.title}</CardTitle>
              {open === f.id ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
            </div>
          </CardHeader>
          {open === f.id && (
            <CardContent className="pt-0 text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
              {f.content}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

function SecuritySection() {
  return (
    <div className="space-y-4">
      <DocCard title="Authentication & Sessions">
        <ul className="list-disc pl-5 space-y-1">
          <li>Passwords hashed with bcrypt (cost factor 12)</li>
          <li>Session-based auth with httpOnly, sameSite=strict cookies (8-hour lifetime)</li>
          <li>Session ID regenerated on login, register, and password change (prevents fixation)</li>
          <li>New CSRF token issued on each session rotation, sent via <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">X-CSRF-Token</code> response header</li>
          <li>Secure cookie flag enabled in production</li>
        </ul>
      </DocCard>

      <DocCard title="Data Protection">
        <ul className="list-disc pl-5 space-y-1">
          <li>All PII fields (account names, institutions, transaction descriptions, notes) encrypted at rest with AES-256-GCM</li>
          <li>Account numbers stored as last-4 only (<code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">****1234</code>)</li>
          <li>Every database query scoped to the authenticated user's ID — no cross-user data leakage possible</li>
          <li>Account ownership verified before any mutation</li>
          <li>All balance updates (create/delete transactions) use Prisma <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">$transaction()</code> to prevent race conditions</li>
        </ul>
      </DocCard>

      <DocCard title="Input Validation & Rate Limiting">
        <ul className="list-disc pl-5 space-y-1">
          <li>express-validator on all POST/PUT routes with strict allowlists for enum fields (type, period, goal type, etc.)</li>
          <li>Global rate limiter: 200 requests/minute/IP</li>
          <li>Auth endpoint rate limiter: 10 attempts/15 minutes/email (email normalized to lowercase)</li>
          <li>Import: max 5,000 rows and 2 MB per request</li>
          <li>String length caps on all user-supplied fields</li>
          <li>Input sanitization middleware strips XSS payloads from all request bodies (safe indexOf scan, not regex)</li>
          <li>HMAC-SHA256 API key hashing (keyed with ENCRYPTION_KEY)</li>
        </ul>
      </DocCard>

      <DocCard title="Headers & Network">
        <ul className="list-disc pl-5 space-y-1">
          <li>Helmet.js: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy</li>
          <li>CORS restricted to configured <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">CORS_ORIGIN</code></li>
          <li>HSTS enabled when <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">ENABLE_HTTPS=true</code></li>
          <li>HTTP→HTTPS redirect server runs on PORT when HTTPS is enabled</li>
          <li>IP trust configured via <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">TRUST_PROXY</code> env var (not X-Forwarded-For header, which can be spoofed)</li>
          <li>Health endpoint returns only <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{`{ status, timestamp }`}</code> — no config details</li>
        </ul>
      </DocCard>

      <DocCard title="Production Checklist">
        <ul className="list-disc pl-5 space-y-1">
          <li>Set a strong random <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">SESSION_SECRET</code> (server exits if missing)</li>
          <li>Set <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">ENCRYPTION_KEY</code> to a 32-byte hex string and keep it safe — losing it means losing access to all encrypted data</li>
          <li>Set <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">ENABLE_HTTPS=true</code> and generate certs (<code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">bun run scripts/generate-certs.ts</code>)</li>
          <li>Set <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">NODE_ENV=production</code> for secure cookies and reduced logging</li>
          <li>Use a persistent session store (Redis) instead of in-memory for multi-instance deployments</li>
          <li>Switch from SQLite to PostgreSQL for concurrent production access</li>
        </ul>
      </DocCard>
    </div>
  );
}

function ContributingSection() {
  return (
    <div className="space-y-4">
      <DocCard title="Project Structure">
        <CodeBlock>{`budget_tracker/
├── server/
│   ├── prisma/
│   │   └── schema.prisma          # DB schema (User, Account, Transaction,
│   │                              #   Debt, Investment, Budget, Goal,
│   │                              #   Scenario, ApiKey, AuditLog, ...)
│   ├── src/
│   │   ├── index.ts               # Express app + middleware stack
│   │   ├── seed.ts                # Demo data seeder
│   │   ├── middleware/
│   │   │   ├── auth.ts            # requireAuth middleware
│   │   │   ├── security.ts        # CSRF, sanitizeInput, headers, requestId
│   │   │   ├── rateLimiter.ts     # Sliding-window rate limiter
│   │   │   ├── audit.ts           # Audit log middleware
│   │   │   └── apiKeyAuth.ts      # API key authentication
│   │   ├── routes/
│   │   │   ├── auth.ts            # Register, login, logout, change-password
│   │   │   ├── accounts.ts        # Account CRUD
│   │   │   ├── transactions.ts    # Transaction CRUD + filters
│   │   │   ├── debts.ts           # Debt CRUD
│   │   │   ├── investments.ts     # Investment CRUD
│   │   │   ├── budgets.ts         # Budget CRUD
│   │   │   ├── goals.ts           # Goal CRUD
│   │   │   ├── dashboard.ts       # Summary, trends, health, forecast
│   │   │   ├── projections.ts     # Debt payoff, investment growth, scenarios
│   │   │   ├── import.ts          # CSV import + providers
│   │   │   ├── apiKeys.ts         # API key management
│   │   │   ├── admin.ts           # Audit log, login history, security status
│   │   │   └── plaid.ts           # Plaid Link integration
│   │   └── services/
│   │       ├── debtPayoff.ts      # Avalanche/snowball calculation engine
│   │       ├── financialHealth.ts # Health score + cash flow forecasting
│   │       ├── encryption.ts      # AES-256-GCM encrypt/decrypt
│   │       └── plaid.ts           # Plaid API client
│   └── scripts/
│       └── generate-certs.ts      # Self-signed TLS cert generation
├── client/
│   └── src/
│       ├── App.tsx                # Router + protected/public route wrappers
│       ├── lib/
│       │   ├── api.ts             # Typed API client + all TypeScript interfaces
│       │   └── utils.ts           # formatCurrency, formatPercent
│       ├── contexts/
│       │   ├── AuthContext.tsx    # Auth state + login/logout
│       │   └── ThemeContext.tsx   # Dark/light mode
│       ├── components/
│       │   ├── Layout.tsx         # Sidebar nav + responsive mobile menu
│       │   └── ui/                # Button, Card, Input, Select, Badge, ...
│       └── pages/
│           ├── Dashboard.tsx      # Financial story + stat cards + charts
│           ├── Accounts.tsx       # Account management
│           ├── Transactions.tsx   # Transaction list + filters + search
│           ├── Debts.tsx          # Debt tracker + action plan
│           ├── Investments.tsx    # Portfolio + growth projector
│           ├── Budgets.tsx        # Budget tracking + history + drill-down
│           ├── Goals.tsx          # Financial goals + progress tracking
│           ├── Reports.tsx        # Health score + cash flow forecast
│           ├── Import.tsx         # CSV import wizard
│           ├── Settings.tsx       # Account settings + API keys
│           └── Docs.tsx           # This page`}</CodeBlock>
      </DocCard>
      <DocCard title="Development Workflow">
        <CodeBlock>{`# Start both server and client
cd server && bun run --watch src/index.ts   # Port 3001 (auto-restarts)
cd client && bun run dev                    # Port 5173 (HMR)

# Database operations
cd server
bunx prisma db push         # Apply schema changes (dev)
bunx prisma studio          # Visual database browser
bun run src/seed.ts         # Re-seed demo data

# Type checking
cd client && bunx tsc --noEmit
cd server && bunx tsc --noEmit

# Production build
cd client && bun run build  # Output to client/dist/
# Server serves dist/ automatically when it exists`}</CodeBlock>
      </DocCard>
      <DocCard title="Adding a New Page">
        <ol className="list-decimal pl-5 space-y-1">
          <li>Create <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">client/src/pages/MyPage.tsx</code> and export a named component</li>
          <li>Add a route in <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">App.tsx</code>: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{`<Route path="/my-page" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />`}</code></li>
          <li>Add a nav item in <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">Layout.tsx</code> navItems array with a path, label, and Lucide icon</li>
          <li>Add any new API methods to <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">client/src/lib/api.ts</code></li>
          <li>If a new DB model is needed: add it to <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">schema.prisma</code>, run <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">bunx prisma db push</code>, create a route file, and register it in <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">index.ts</code></li>
        </ol>
      </DocCard>
    </div>
  );
}
