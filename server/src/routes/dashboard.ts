import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.ts';
import { calculateHealthScore } from '../services/financialHealth.ts';
import { forecastCashFlow } from '../services/financialHealth.ts';
import { decrypt } from '../services/encryption.ts';

const router = Router();
router.use(requireAuth);

function tryDecrypt(value: string | null | undefined): string {
  if (!value) return '';
  try { return decrypt(value); } catch { return value; }
}

router.get('/summary', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const userId = req.session.userId;

  const accounts = await prisma.account.findMany({ where: { userId, isActive: true } });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const monthlyTransactions = await prisma.transaction.findMany({
    where: { account: { userId }, date: { gte: startOfMonth, lte: endOfMonth } },
  });

  const totalAssets = accounts
    .filter((a: any) => ['bank', 'investment'].includes(a.type))
    .reduce((sum: number, a: any) => sum + a.balance, 0);

  const totalLiabilities = accounts
    .filter((a: any) => ['credit_card', 'loan'].includes(a.type))
    .reduce((sum: number, a: any) => sum + Math.abs(a.balance), 0);

  const monthlyIncome = monthlyTransactions
    .filter((t: any) => t.type === 'income')
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const monthlyExpenses = monthlyTransactions
    .filter((t: any) => t.type === 'expense')
    .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

  const debts = await prisma.debt.findMany({ where: { account: { userId } } });
  const investments = await prisma.investment.findMany({ where: { account: { userId } } });

  res.json({
    summary: {
      totalAssets, totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
      monthlyIncome, monthlyExpenses,
      monthlySavings: monthlyIncome - monthlyExpenses,
      savingsRate: monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0,
      totalDebt: debts.reduce((sum: number, d: any) => sum + d.currentBalance, 0),
      totalInvestments: investments.reduce((sum: number, i: any) => sum + i.currentValue, 0),
      accountCount: accounts.length,
      debtCount: debts.length,
      investmentCount: investments.length,
    },
  });
});

router.get('/spending-by-category', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const userId = req.session.userId;
  const { startDate, endDate } = req.query;

  const now = new Date();
  const start = startDate ? new Date(startDate as string) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = endDate ? new Date(endDate as string) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const transactions = await prisma.transaction.findMany({
    where: { account: { userId }, type: 'expense', date: { gte: start, lte: end } },
  });

  const categoryMap: Record<string, number> = {};
  for (const t of transactions) {
    const cat = t.category || 'Uncategorized';
    categoryMap[cat] = (categoryMap[cat] || 0) + Math.abs(t.amount);
  }

  const categories = Object.entries(categoryMap)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  res.json({ categories, startDate: start, endDate: end });
});

router.get('/monthly-trend', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const userId = req.session.userId;
  const months = Math.min(Math.max(1, parseInt(req.query.months as string) || 6), 60);

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const transactions = await prisma.transaction.findMany({
    where: { account: { userId }, date: { gte: startDate } },
    orderBy: { date: 'asc' },
  });

  const monthlyData: Record<string, { income: number; expenses: number }> = {};
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[key] = { income: 0, expenses: 0 };
  }

  for (const t of transactions) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyData[key]) {
      if (t.type === 'income') monthlyData[key]!.income += t.amount;
      else if (t.type === 'expense') monthlyData[key]!.expenses += Math.abs(t.amount);
    }
  }

  const trend = Object.entries(monthlyData).map(([month, data]) => ({
    month, ...data, savings: data.income - data.expenses,
  }));

  res.json({ trend });
});

// GET /api/dashboard/health-score
router.get('/health-score', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const userId = req.session.userId;

  const accounts = await prisma.account.findMany({ where: { userId, isActive: true } });
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const monthlyTransactions = await prisma.transaction.findMany({
    where: { account: { userId }, date: { gte: startOfMonth, lte: endOfMonth } },
  });

  const monthlyIncome = monthlyTransactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0);
  const monthlyExpenses = monthlyTransactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Math.abs(t.amount), 0);
  const totalDebt = (await prisma.debt.findMany({ where: { account: { userId } } })).reduce((s: number, d: any) => s + d.currentBalance, 0);
  const totalAssets = accounts.filter((a: any) => ['bank', 'investment'].includes(a.type)).reduce((s: number, a: any) => s + a.balance, 0);
  const totalInvestments = (await prisma.investment.findMany({ where: { account: { userId } } })).reduce((s: number, i: any) => s + i.currentValue, 0);
  const emergencyFundBalance = accounts.filter((a: any) => a.type === 'bank' && a.subtype === 'savings').reduce((s: number, a: any) => s + a.balance, 0);

  const creditCards = accounts.filter((a: any) => a.type === 'credit_card');
  const totalCreditUsed = creditCards.reduce((s: number, a: any) => s + Math.abs(a.balance), 0);
  const totalCreditLimit = creditCards.reduce((s: number, a: any) => s + (a.creditLimit || 0), 0);
  const creditUtilization = totalCreditLimit > 0 ? (totalCreditUsed / totalCreditLimit) * 100 : 0;

  const result = calculateHealthScore({
    monthlyIncome, monthlyExpenses, totalDebt, totalAssets,
    totalInvestments, emergencyFundBalance, creditUtilization,
  });

  res.json({ healthScore: result });
});

// GET /api/dashboard/cash-flow-forecast
router.get('/cash-flow-forecast', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const userId = req.session.userId;
  const days = Math.min(Math.max(1, parseInt(req.query.days as string) || 90), 365);

  const accounts = await prisma.account.findMany({ where: { userId, isActive: true } });
  const currentBalance = accounts
    .filter((a: any) => a.type === 'bank')
    .reduce((s: number, a: any) => s + a.balance, 0);

  // Find recurring transactions from the last 2 months
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  const recentTransactions = await prisma.transaction.findMany({
    where: { account: { userId }, isRecurring: true, date: { gte: twoMonthsAgo } },
  });

  // Group by description and extract typical day of month
  const recurringMap = new Map<string, { amounts: number[]; days: number[]; type: string; rawDesc: string }>();
  for (const t of recentTransactions) {
    // Decrypt description for grouping
    const desc = tryDecrypt(t.description);
    const key = desc;
    if (!recurringMap.has(key)) recurringMap.set(key, { amounts: [], days: [], type: t.type, rawDesc: desc });
    const entry = recurringMap.get(key)!;
    entry.amounts.push(t.amount);
    entry.days.push(new Date(t.date).getDate());
  }

  const recurringIncome: { amount: number; dayOfMonth: number; description: string }[] = [];
  const recurringExpenses: { amount: number; dayOfMonth: number; description: string }[] = [];

  for (const [, data] of recurringMap) {
    const avgAmount = data.amounts.reduce((s, a) => s + a, 0) / data.amounts.length;
    const avgDay = Math.round(data.days.reduce((s, d) => s + d, 0) / data.days.length);

    if (data.type === 'income') {
      recurringIncome.push({ amount: avgAmount, dayOfMonth: avgDay, description: data.rawDesc });
    } else {
      recurringExpenses.push({ amount: avgAmount, dayOfMonth: avgDay, description: data.rawDesc });
    }
  }

  const forecast = forecastCashFlow(currentBalance, recurringIncome, recurringExpenses, days);

  res.json({
    forecast,
    currentBalance,
    recurringIncome,
    recurringExpenses,
    lowBalanceAlert: forecast.some(f => f.projectedBalance < 500),
    minimumProjectedBalance: Math.min(...forecast.map(f => f.projectedBalance)),
  });
});

export default router;
