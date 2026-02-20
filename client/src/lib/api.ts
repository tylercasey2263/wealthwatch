const API_BASE = '/api';

// CSRF token management — stored from response headers
let csrfToken: string | null = null;

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers as Record<string, string>,
  };

  // Attach CSRF token for state-changing requests
  if (csrfToken && !['GET', 'HEAD'].includes(options?.method || 'GET')) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Capture CSRF token from response headers
  const newCsrfToken = res.headers.get('X-CSRF-Token');
  if (newCsrfToken) csrfToken = newCsrfToken;

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.errors?.[0]?.msg || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    request<{ user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request<{ user: User }>('/auth/me'),

  getAccounts: () => request<{ accounts: Account[] }>('/accounts'),
  getAccount: (id: string) => request<{ account: Account }>(`/accounts/${id}`),
  createAccount: (data: Partial<Account>) =>
    request<{ account: Account }>('/accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateAccount: (id: string, data: Partial<Account>) =>
    request<{ account: Account }>(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAccount: (id: string) => request(`/accounts/${id}`, { method: 'DELETE' }),

  getTransactions: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ transactions: Transaction[]; total: number }>(`/transactions${query}`);
  },
  createTransaction: (data: Partial<Transaction>) =>
    request<{ transaction: Transaction }>('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id: string, data: Partial<Transaction>) =>
    request<{ transaction: Transaction }>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransaction: (id: string) => request(`/transactions/${id}`, { method: 'DELETE' }),

  getDebts: () => request<{ debts: Debt[] }>('/debts'),
  createDebt: (data: Partial<Debt>) =>
    request<{ debt: Debt }>('/debts', { method: 'POST', body: JSON.stringify(data) }),
  updateDebt: (id: string, data: Partial<Debt>) =>
    request<{ debt: Debt }>(`/debts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDebt: (id: string) => request(`/debts/${id}`, { method: 'DELETE' }),

  getInvestments: () => request<{ investments: Investment[] }>('/investments'),
  createInvestment: (data: Partial<Investment>) =>
    request<{ investment: Investment }>('/investments', { method: 'POST', body: JSON.stringify(data) }),
  updateInvestment: (id: string, data: Partial<Investment>) =>
    request<{ investment: Investment }>(`/investments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInvestment: (id: string) => request(`/investments/${id}`, { method: 'DELETE' }),

  getBudgets: () => request<{ budgets: Budget[] }>('/budgets'),
  createBudget: (data: Partial<Budget>) =>
    request<{ budget: Budget }>('/budgets', { method: 'POST', body: JSON.stringify(data) }),
  updateBudget: (id: string, data: Partial<Budget>) =>
    request<{ budget: Budget }>(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBudget: (id: string) => request(`/budgets/${id}`, { method: 'DELETE' }),

  getDashboardSummary: () => request<{ summary: DashboardSummary }>('/dashboard/summary'),
  getSpendingByCategory: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ categories: CategorySpending[] }>(`/dashboard/spending-by-category${query}`);
  },
  getMonthlyTrend: (months?: number) => {
    const query = months ? `?months=${months}` : '';
    return request<{ trend: MonthlyTrend[] }>(`/dashboard/monthly-trend${query}`);
  },
  getHealthScore: () => request<{ healthScore: HealthScoreResult }>('/dashboard/health-score'),
  getCashFlowForecast: (days?: number) => {
    const query = days ? `?days=${days}` : '';
    return request<CashFlowForecastResponse>(`/dashboard/cash-flow-forecast${query}`);
  },
  importCSVPreview: (csvContent: string) =>
    request<{ headers: string[]; preview: string[][]; totalRows: number }>('/import/csv-preview', { method: 'POST', body: JSON.stringify({ csvContent }) }),
  importCSV: (accountId: string, csvContent: string, mapping: any) =>
    request<{ imported: number; skipped: number; total: number }>('/import/csv', { method: 'POST', body: JSON.stringify({ accountId, csvContent, mapping }) }),
  getProviders: () => request<{ providers: any[] }>('/import/providers'),

  // Projections
  getDebtPayoff: (strategy: string, extraMonthly: number) =>
    request<{ result: DebtPayoffResult }>('/projections/debt-payoff', { method: 'POST', body: JSON.stringify({ strategy, extraMonthly }) }),
  getDebtCompare: (extraMonthly: number) =>
    request<{ result: DebtCompareResult }>('/projections/debt-compare', { method: 'POST', body: JSON.stringify({ extraMonthly }) }),
  getInvestmentGrowth: (params: { years?: number; annualReturn?: number; monthlyContribution?: number; initialBalance?: number }) =>
    request<{ projection: InvestmentProjection[]; monteCarlo: any[]; params: any }>('/projections/investment-growth', { method: 'POST', body: JSON.stringify(params) }),
  saveScenario: (data: { name: string; description?: string; type: string; parameters: any; results?: any }) =>
    request<{ scenario: any }>('/projections/scenario-save', { method: 'POST', body: JSON.stringify(data) }),
  getScenarios: () => request<{ scenarios: any[] }>('/projections/scenarios'),

  // API Keys
  getApiKeys: () => request<{ apiKeys: ApiKeyInfo[] }>('/api-keys'),
  createApiKey: (data: { name: string; permissions?: string; expiresInDays?: number }) =>
    request<{ apiKey: ApiKeyInfo; rawKey: string; warning: string }>('/api-keys', { method: 'POST', body: JSON.stringify(data) }),
  revokeApiKey: (id: string) => request(`/api-keys/${id}`, { method: 'DELETE' }),

  // Admin / Security
  getAuditLog: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ logs: AuditLogEntry[]; total: number }>(`/admin/audit-log${query}`);
  },
  getLoginHistory: () => request<{ attempts: LoginAttemptEntry[] }>('/admin/login-history'),
  getSecurityStatus: () => request<{ security: SecurityStatus }>('/admin/security-status'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),

  // Plaid
  getPlaidStatus: () => request<{ configured: boolean; environment: string }>('/plaid/status'),
  createPlaidLinkToken: () => request<{ linkToken: string }>('/plaid/link-token', { method: 'POST' }),
  exchangePlaidToken: (publicToken: string, institutionName: string) =>
    request<{ success: boolean; accounts: Account[]; message: string }>('/plaid/exchange', { method: 'POST', body: JSON.stringify({ publicToken, institutionName }) }),
};

export interface User {
  id: string; email: string; firstName: string; lastName: string; createdAt?: string;
}
export interface Account {
  id: string; userId: string; name: string; institution: string;
  type: 'bank' | 'credit_card' | 'loan' | 'investment' | 'income';
  subtype?: string; balance: number; creditLimit?: number; interestRate?: number;
  minimumPayment?: number; accountNumber?: string; isActive: boolean;
  createdAt: string; updatedAt: string; transactions?: Transaction[];
}
export interface Transaction {
  id: string; accountId: string; date: string; description: string; amount: number;
  category: string; subcategory?: string; type: 'income' | 'expense' | 'transfer';
  isRecurring: boolean; notes?: string;
  account?: { name: string; institution: string; type: string };
}
export interface Debt {
  id: string; accountId: string; name: string; originalBalance: number;
  currentBalance: number; interestRate: number; minimumPayment: number;
  dueDate?: number; startDate: string;
  account?: { name: string; institution: string };
}
export interface Investment {
  id: string; accountId: string; name: string; currentValue: number;
  costBasis?: number; monthlyContribution: number; employerMatch?: number;
  returnRate?: number; allocations?: string;
  account?: { name: string; institution: string };
}
export interface Budget {
  id: string; userId: string; category: string; amount: number; period: string;
}
export interface DashboardSummary {
  totalAssets: number; totalLiabilities: number; netWorth: number;
  monthlyIncome: number; monthlyExpenses: number; monthlySavings: number;
  savingsRate: number; totalDebt: number; totalInvestments: number;
  accountCount: number; debtCount: number; investmentCount: number;
}
export interface CategorySpending { category: string; amount: number; }
export interface MonthlyTrend { month: string; income: number; expenses: number; savings: number; }
export interface DebtPayoffResult {
  strategy: string; months: number; totalPaid: number; totalInterest: number;
  schedule: { month: number; totalBalance: number; totalPayment: number; totalInterest: number; debts: any[] }[];
  debtPayoffOrder: { id: string; name: string; payoffMonth: number }[];
}
export interface DebtCompareResult {
  avalanche: DebtPayoffResult; snowball: DebtPayoffResult;
  interestSaved: number; monthsSaved: number;
}
export interface InvestmentProjection {
  year: number; balance: number; contributions: number; growth: number;
}
export interface HealthScoreResult {
  overallScore: number; grade: string;
  components: Record<string, { score: number; value: number; label: string }>;
  recommendations: string[];
}
export interface CashFlowForecastResponse {
  forecast: { date: string; projectedBalance: number; income: number; expenses: number; label?: string }[];
  currentBalance: number; lowBalanceAlert: boolean; minimumProjectedBalance: number;
  recurringIncome: any[]; recurringExpenses: any[];
}
export interface ApiKeyInfo {
  id: string; name: string; keyPrefix: string; permissions: string;
  lastUsedAt: string | null; expiresAt: string | null; isActive: boolean; createdAt: string;
}
export interface AuditLogEntry {
  id: string; userId: string | null; action: string; resource: string;
  resourceId: string | null; details: string | null; ipAddress: string | null;
  userAgent: string | null; requestId: string | null; status: number; createdAt: string;
}
export interface LoginAttemptEntry {
  id: string; email: string; ipAddress: string | null; userAgent: string | null;
  success: boolean; reason: string | null; createdAt: string;
}
export interface SecurityStatus {
  activeApiKeys: number; recentFailedLogins: number; recentAuditActions: number;
  accountCount: number; accountsWithNumbers: number; encryptionEnabled: boolean;
  sessionSecure: boolean; recommendations: string[];
}
