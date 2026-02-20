export interface DebtInput {
  id: string;
  name: string;
  balance: number;
  rate: number;       // annual interest rate as percentage
  minimum: number;    // minimum monthly payment
}

export interface PayoffMonth {
  month: number;
  debts: { id: string; name: string; balance: number; payment: number; interest: number; principal: number }[];
  totalBalance: number;
  totalPayment: number;
  totalInterest: number;
}

export interface PayoffResult {
  strategy: 'avalanche' | 'snowball';
  months: number;
  totalPaid: number;
  totalInterest: number;
  schedule: PayoffMonth[];
  debtPayoffOrder: { id: string; name: string; payoffMonth: number }[];
}

export function calculatePayoff(
  debts: DebtInput[],
  strategy: 'avalanche' | 'snowball',
  extraMonthly: number = 0
): PayoffResult {
  // Sort debts: avalanche = highest rate first, snowball = lowest balance first
  const sorted = [...debts].sort((a, b) =>
    strategy === 'avalanche' ? b.rate - a.rate : a.balance - b.balance
  );

  // Working balances
  const balances: Record<string, number> = {};
  for (const d of sorted) balances[d.id] = d.balance;

  const schedule: PayoffMonth[] = [];
  const payoffOrder: { id: string; name: string; payoffMonth: number }[] = [];
  let totalInterestPaid = 0;
  let totalPaid = 0;
  let month = 0;
  const maxMonths = 360; // 30 year cap

  while (month < maxMonths) {
    const remaining = sorted.filter(d => balances[d.id]! > 0.01);
    if (remaining.length === 0) break;

    month++;
    let extraBudget = extraMonthly;
    // When a debt is paid off, its minimum rolls into extra budget
    const freedMinimums = sorted.filter(d => balances[d.id]! <= 0.01).reduce((s, d) => s + d.minimum, 0);
    extraBudget += freedMinimums;

    const monthDebts: PayoffMonth['debts'] = [];
    let monthTotalPayment = 0;
    let monthTotalInterest = 0;

    // First pass: apply minimums and calculate interest
    for (const d of remaining) {
      const bal = balances[d.id]!;
      const monthlyRate = d.rate / 100 / 12;
      const interest = bal * monthlyRate;
      const minPayment = Math.min(d.minimum, bal + interest);

      monthDebts.push({ id: d.id, name: d.name, balance: bal, payment: minPayment, interest, principal: minPayment - interest });
    }

    // Second pass: apply extra payment to target debt (first in sorted order that still has balance)
    for (const d of sorted) {
      if (balances[d.id]! <= 0.01 || extraBudget <= 0) continue;
      const entry = monthDebts.find(m => m.id === d.id);
      if (!entry) continue;

      const maxExtra = Math.min(extraBudget, entry.balance + entry.interest - entry.payment + 0.01);
      if (maxExtra > 0) {
        entry.payment += maxExtra;
        entry.principal += maxExtra;
        extraBudget -= maxExtra;
      }
      break; // Extra goes to top priority debt only
    }

    // Apply payments to balances
    for (const entry of monthDebts) {
      balances[entry.id] = Math.max(0, entry.balance + entry.interest - entry.payment);
      entry.balance = balances[entry.id]!;
      monthTotalPayment += entry.payment;
      monthTotalInterest += entry.interest;

      // Check if debt was just paid off
      if (balances[entry.id]! <= 0.01 && !payoffOrder.find(p => p.id === entry.id)) {
        payoffOrder.push({ id: entry.id, name: entry.name, payoffMonth: month });
      }
    }

    totalPaid += monthTotalPayment;
    totalInterestPaid += monthTotalInterest;

    schedule.push({
      month,
      debts: monthDebts,
      totalBalance: Object.values(balances).reduce((s, b) => s + b, 0),
      totalPayment: monthTotalPayment,
      totalInterest: monthTotalInterest,
    });
  }

  return {
    strategy,
    months: month,
    totalPaid,
    totalInterest: totalInterestPaid,
    schedule,
    debtPayoffOrder: payoffOrder,
  };
}

export function compareStrategies(debts: DebtInput[], extraMonthly: number = 0) {
  const avalanche = calculatePayoff(debts, 'avalanche', extraMonthly);
  const snowball = calculatePayoff(debts, 'snowball', extraMonthly);

  return {
    avalanche,
    snowball,
    interestSaved: snowball.totalInterest - avalanche.totalInterest,
    monthsSaved: snowball.months - avalanche.months,
  };
}
