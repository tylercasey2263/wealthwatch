import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.ts';
import { calculatePayoff, compareStrategies } from '../services/debtPayoff.ts';
import type { DebtInput } from '../services/debtPayoff.ts';
import { decrypt, encrypt } from '../services/encryption.ts';

const router = Router();
router.use(requireAuth);

const VALID_SCENARIO_TYPES = ['debt-payoff', 'debt-compare', 'investment-growth'];
const MAX_EXTRA_MONTHLY = 100_000;
const MAX_SCENARIO_NAME = 200;
const MAX_SCENARIO_DESC = 2_000;
const MAX_SCENARIO_JSON = 50_000; // 50KB

// POST /api/projections/debt-payoff
router.post('/debt-payoff', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const { strategy = 'avalanche', extraMonthly = 0, customDebts } = req.body;

  // Validate strategy
  if (!['avalanche', 'snowball'].includes(strategy)) {
    res.status(400).json({ error: 'Strategy must be "avalanche" or "snowball"' });
    return;
  }
  // Cap extra payment to prevent absurd calculations
  const safeExtra = Math.min(Math.max(0, Number(extraMonthly) || 0), MAX_EXTRA_MONTHLY);

  let debts: DebtInput[];

  if (customDebts) {
    // Validate custom debts — cap at 50 entries
    if (!Array.isArray(customDebts) || customDebts.length > 50) {
      res.status(400).json({ error: 'customDebts must be an array of up to 50 items' });
      return;
    }
    // Sanitize each debt input
    debts = customDebts.map((d: any) => ({
      id: String(d.id || ''),
      name: String(d.name || 'Unknown').slice(0, 200),
      balance: Math.max(0, Number(d.balance) || 0),
      rate: Math.max(0, Math.min(100, Number(d.rate) || 0)),
      minimum: Math.max(0, Number(d.minimum) || 0),
    }));
  } else {
    const dbDebts = await prisma.debt.findMany({
      where: { account: { userId: req.session.userId } },
    });
    debts = dbDebts.map((d: any) => {
      let name = d.name;
      try { name = decrypt(d.name); } catch { /* legacy */ }
      return { id: d.id, name, balance: d.currentBalance, rate: d.interestRate, minimum: d.minimumPayment };
    });
  }

  if (debts.length === 0) {
    res.json({ result: null, message: 'No debts to calculate' });
    return;
  }

  const result = calculatePayoff(debts, strategy, safeExtra);
  // Return condensed schedule (every month for first 12, then every 3 months)
  const condensedSchedule = result.schedule.filter((s, i) =>
    i < 12 || i % 3 === 0 || i === result.schedule.length - 1
  );

  res.json({ result: { ...result, schedule: condensedSchedule } });
});

// POST /api/projections/debt-compare
router.post('/debt-compare', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const { extraMonthly = 0 } = req.body;

  // Cap extraMonthly — same guard as debt-payoff
  const safeExtra = Math.min(Math.max(0, Number(extraMonthly) || 0), MAX_EXTRA_MONTHLY);

  const dbDebts = await prisma.debt.findMany({
    where: { account: { userId: req.session.userId } },
  });
  const debts: DebtInput[] = dbDebts.map((d: any) => {
    let name = d.name;
    try { name = decrypt(d.name); } catch { /* legacy */ }
    return { id: d.id, name, balance: d.currentBalance, rate: d.interestRate, minimum: d.minimumPayment };
  });

  if (debts.length === 0) {
    res.json({ result: null, message: 'No debts to compare' });
    return;
  }

  const comparison = compareStrategies(debts, safeExtra);
  // Condense schedules
  const condense = (schedule: any[]) => schedule.filter((s: any, i: number) =>
    i < 12 || i % 3 === 0 || i === schedule.length - 1
  );

  res.json({
    result: {
      avalanche: { ...comparison.avalanche, schedule: condense(comparison.avalanche.schedule) },
      snowball: { ...comparison.snowball, schedule: condense(comparison.snowball.schedule) },
      interestSaved: comparison.interestSaved,
      monthsSaved: comparison.monthsSaved,
    },
  });
});

// POST /api/projections/investment-growth
router.post('/investment-growth', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const { years: rawYears = 30, annualReturn, monthlyContribution, initialBalance } = req.body;

  // Cap years to prevent expensive computation (DoS protection)
  const years = Math.min(Math.max(1, Number(rawYears) || 30), 50);

  // Validate and clamp annualReturn to -50%..100% range
  let annualReturnPct = annualReturn !== undefined ? Number(annualReturn) : 7;
  if (!isFinite(annualReturnPct)) annualReturnPct = 7;
  annualReturnPct = Math.min(Math.max(annualReturnPct, -50), 100);

  // Clamp user-supplied balances to prevent integer overflow / absurd computation
  let currentBalance = initialBalance != null ? Math.min(Math.max(0, Number(initialBalance) || 0), 1e9) : undefined;
  let monthlyAdd = monthlyContribution != null ? Math.min(Math.max(0, Number(monthlyContribution) || 0), 1e6) : undefined;

  if (currentBalance === undefined || monthlyAdd === undefined) {
    const investments = await prisma.investment.findMany({
      where: { account: { userId: req.session.userId } },
    });
    if (currentBalance === undefined) {
      currentBalance = Math.min(investments.reduce((s: number, i: any) => s + i.currentValue, 0), 1e9);
    }
    if (monthlyAdd === undefined) {
      monthlyAdd = Math.min(investments.reduce((s: number, i: any) => s + i.monthlyContribution, 0), 1e6);
    }
  }

  const rate = annualReturnPct / 100;
  const monthlyRate = rate / 12;
  const projection: { year: number; balance: number; contributions: number; growth: number }[] = [];
  let totalContributions = currentBalance;
  let balance = currentBalance;

  for (let year = 1; year <= years; year++) {
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + monthlyRate) + monthlyAdd;
      totalContributions += monthlyAdd;
    }
    projection.push({
      year,
      balance: Math.round(balance * 100) / 100,
      contributions: Math.round(totalContributions * 100) / 100,
      growth: Math.round((balance - totalContributions) * 100) / 100,
    });
  }

  // Monte Carlo: run 50 simulations per scenario across 3 risk profiles
  const runSimulation = (avgReturn: number, stdDev: number) => {
    let bal = currentBalance;
    const results: number[] = [];
    for (let year = 1; year <= years; year++) {
      for (let m = 0; m < 12; m++) {
        const randomReturn = avgReturn + stdDev * (Math.random() * 2 - 1);
        bal = bal! * (1 + randomReturn / 12) + monthlyAdd!;
      }
      results.push(Math.round(bal * 100) / 100);
    }
    return results;
  };

  const conservativeRuns: number[][] = [];
  const moderateRuns: number[][] = [];
  const aggressiveRuns: number[][] = [];

  for (let i = 0; i < 50; i++) {
    conservativeRuns.push(runSimulation(0.05, 0.08));
    moderateRuns.push(runSimulation(0.07, 0.12));
    aggressiveRuns.push(runSimulation(0.10, 0.18));
  }

  const getPercentile = (runs: number[][], yearIdx: number, pct: number) => {
    const values = runs.map(r => r[yearIdx]!).sort((a, b) => a - b);
    const idx = Math.floor(values.length * pct);
    return values[idx]!;
  };

  const monteCarlo: { year: number; conservative: { low: number; mid: number; high: number }; moderate: { low: number; mid: number; high: number }; aggressive: { low: number; mid: number; high: number } }[] = [];

  for (let y = 0; y < years; y++) {
    monteCarlo.push({
      year: y + 1,
      conservative: { low: getPercentile(conservativeRuns, y, 0.1), mid: getPercentile(conservativeRuns, y, 0.5), high: getPercentile(conservativeRuns, y, 0.9) },
      moderate: { low: getPercentile(moderateRuns, y, 0.1), mid: getPercentile(moderateRuns, y, 0.5), high: getPercentile(moderateRuns, y, 0.9) },
      aggressive: { low: getPercentile(aggressiveRuns, y, 0.1), mid: getPercentile(aggressiveRuns, y, 0.5), high: getPercentile(aggressiveRuns, y, 0.9) },
    });
  }

  res.json({
    projection,
    monteCarlo,
    params: { initialBalance: currentBalance, monthlyContribution: monthlyAdd, annualReturn: annualReturnPct, years },
  });
});

// POST /api/projections/scenario-save
router.post('/scenario-save', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const { name, description, type, parameters, results } = req.body;

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (name.length > MAX_SCENARIO_NAME) {
    res.status(400).json({ error: `name must be ${MAX_SCENARIO_NAME} characters or fewer` });
    return;
  }
  if (description !== undefined && (typeof description !== 'string' || description.length > MAX_SCENARIO_DESC)) {
    res.status(400).json({ error: `description must be a string of ${MAX_SCENARIO_DESC} characters or fewer` });
    return;
  }
  if (!type || !VALID_SCENARIO_TYPES.includes(type)) {
    res.status(400).json({ error: `type must be one of: ${VALID_SCENARIO_TYPES.join(', ')}` });
    return;
  }
  if (parameters === undefined || parameters === null) {
    res.status(400).json({ error: 'parameters is required' });
    return;
  }

  // Enforce size limits on JSON payloads before encrypting
  const parametersJson = JSON.stringify(parameters);
  if (parametersJson.length > MAX_SCENARIO_JSON) {
    res.status(400).json({ error: 'parameters payload too large' });
    return;
  }
  const resultsJson = results !== undefined ? JSON.stringify(results) : null;
  if (resultsJson && resultsJson.length > MAX_SCENARIO_JSON) {
    res.status(400).json({ error: 'results payload too large' });
    return;
  }

  const scenario = await prisma.scenario.create({
    data: {
      userId: req.session.userId!,
      name: encrypt(name.trim()),
      description: description ? encrypt(description) : null,
      type,
      parameters: encrypt(parametersJson),
      results: resultsJson ? encrypt(resultsJson) : null,
    },
  });
  res.status(201).json({ scenario });
});

// GET /api/projections/scenarios
router.get('/scenarios', async (req: Request, res: Response): Promise<void> => {
  const prisma = (req as any).prisma;
  const scenarios = await prisma.scenario.findMany({
    where: { userId: req.session.userId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({
    scenarios: scenarios.map((s: any) => {
      let name = s.name, description = s.description, parameters = s.parameters, results = s.results;
      try { name = decrypt(name); } catch { /* legacy */ }
      try { if (description) description = decrypt(description); } catch { /* legacy */ }
      try { parameters = JSON.parse(decrypt(parameters)); } catch { try { parameters = JSON.parse(parameters); } catch { /* legacy */ } }
      try { if (results) results = JSON.parse(decrypt(results)); } catch { try { if (results) results = JSON.parse(results); } catch { /* legacy */ } }
      return { ...s, name, description, parameters, results };
    }),
  });
});

export default router;
