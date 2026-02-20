export interface HealthScoreInput {
  monthlyIncome: number;
  monthlyExpenses: number;
  totalDebt: number;
  totalAssets: number;
  totalInvestments: number;
  emergencyFundBalance: number;  // savings accounts
  creditUtilization: number;     // percentage
}

export interface HealthScoreResult {
  overallScore: number;          // 0-100
  grade: string;                 // A, B, C, D, F
  components: {
    savingsRate: { score: number; value: number; label: string };
    debtToIncome: { score: number; value: number; label: string };
    emergencyFund: { score: number; value: number; label: string };
    investmentRate: { score: number; value: number; label: string };
    creditUtilization: { score: number; value: number; label: string };
  };
  recommendations: string[];
}

export function calculateHealthScore(input: HealthScoreInput): HealthScoreResult {
  const {
    monthlyIncome, monthlyExpenses, totalDebt,
    totalAssets, totalInvestments, emergencyFundBalance, creditUtilization
  } = input;

  // 1. Savings Rate (20 points) - target: 20%+
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
  const savingsScore = Math.min(20, Math.max(0, savingsRate));

  // 2. Debt-to-Income (20 points) - target: < 36%
  const dti = monthlyIncome > 0 ? (totalDebt / (monthlyIncome * 12)) * 100 : 100;
  const dtiScore = dti <= 0 ? 20 : dti <= 20 ? 18 : dti <= 36 ? 14 : dti <= 50 ? 8 : 2;

  // 3. Emergency Fund (20 points) - target: 6+ months
  const emergencyMonths = monthlyExpenses > 0 ? emergencyFundBalance / monthlyExpenses : 0;
  const emergencyScore = emergencyMonths >= 6 ? 20 : emergencyMonths >= 3 ? 14 : emergencyMonths >= 1 ? 8 : 2;

  // 4. Investment Rate (20 points) - target: 15%+ of income
  const investmentRate = monthlyIncome > 0 ? (totalInvestments / (monthlyIncome * 12)) * 100 : 0;
  const investmentScore = Math.min(20, investmentRate >= 100 ? 20 : investmentRate >= 50 ? 16 : investmentRate >= 25 ? 12 : investmentRate >= 10 ? 8 : 4);

  // 5. Credit Utilization (20 points) - target: < 30%
  const utilizationScore = creditUtilization <= 10 ? 20 : creditUtilization <= 30 ? 16 : creditUtilization <= 50 ? 10 : creditUtilization <= 75 ? 5 : 1;

  const overallScore = Math.round(savingsScore + dtiScore + emergencyScore + investmentScore + utilizationScore);

  const grade = overallScore >= 90 ? 'A' : overallScore >= 80 ? 'B' : overallScore >= 65 ? 'C' : overallScore >= 50 ? 'D' : 'F';

  const recommendations: string[] = [];
  if (savingsRate < 20) recommendations.push(`Increase savings rate from ${savingsRate.toFixed(1)}% to at least 20% of income`);
  if (dti > 36) recommendations.push(`Reduce debt-to-income ratio from ${dti.toFixed(1)}% — target under 36%`);
  if (emergencyMonths < 3) recommendations.push(`Build emergency fund to at least 3 months of expenses (${Math.round(monthlyExpenses * 3 - emergencyFundBalance)} more needed)`);
  if (emergencyMonths < 6 && emergencyMonths >= 3) recommendations.push(`Grow emergency fund from ${emergencyMonths.toFixed(1)} to 6 months of expenses`);
  if (creditUtilization > 30) recommendations.push(`Lower credit utilization from ${creditUtilization.toFixed(0)}% to under 30%`);
  if (recommendations.length === 0) recommendations.push('Excellent financial health! Consider increasing investment contributions.');

  return {
    overallScore,
    grade,
    components: {
      savingsRate: { score: Math.round(savingsScore), value: savingsRate, label: `${savingsRate.toFixed(1)}% savings rate` },
      debtToIncome: { score: dtiScore, value: dti, label: `${dti.toFixed(1)}% DTI ratio` },
      emergencyFund: { score: emergencyScore, value: emergencyMonths, label: `${emergencyMonths.toFixed(1)} months coverage` },
      investmentRate: { score: investmentScore, value: investmentRate, label: `${investmentRate.toFixed(1)}% invested` },
      creditUtilization: { score: utilizationScore, value: creditUtilization, label: `${creditUtilization.toFixed(0)}% utilization` },
    },
    recommendations,
  };
}

export interface CashFlowForecast {
  date: string;
  projectedBalance: number;
  income: number;
  expenses: number;
  label?: string;
}

export function forecastCashFlow(
  currentBalance: number,
  recurringIncome: { amount: number; dayOfMonth: number; description: string }[],
  recurringExpenses: { amount: number; dayOfMonth: number; description: string }[],
  days: number = 90
): CashFlowForecast[] {
  const forecast: CashFlowForecast[] = [];
  let balance = currentBalance;
  const today = new Date();

  for (let d = 0; d < days; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() + d);
    const dayOfMonth = date.getDate();

    let dayIncome = 0;
    let dayExpense = 0;
    const labels: string[] = [];

    for (const inc of recurringIncome) {
      if (inc.dayOfMonth === dayOfMonth) {
        dayIncome += inc.amount;
        labels.push(`+${inc.description}`);
      }
    }
    for (const exp of recurringExpenses) {
      if (exp.dayOfMonth === dayOfMonth) {
        dayExpense += Math.abs(exp.amount);
        labels.push(`-${exp.description}`);
      }
    }

    balance = balance + dayIncome - dayExpense;

    forecast.push({
      date: date.toISOString().split('T')[0]!,
      projectedBalance: Math.round(balance * 100) / 100,
      income: dayIncome,
      expenses: dayExpense,
      label: labels.length > 0 ? labels.join(', ') : undefined,
    });
  }

  return forecast;
}
