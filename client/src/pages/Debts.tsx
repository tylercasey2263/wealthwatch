import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Debt, Account, DebtCompareResult } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { formatCurrency } from '../lib/utils';
import { Plus, X, CreditCard, Calculator, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function Debts() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [extraPayment, setExtraPayment] = useState(0);
  const [comparison, setComparison] = useState<DebtCompareResult | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [form, setForm] = useState({ accountId: '', name: '', originalBalance: '', currentBalance: '', interestRate: '', minimumPayment: '' });

  useEffect(() => {
    Promise.all([api.getDebts(), api.getAccounts()]).then(([d, a]) => {
      setDebts(d.debts);
      setAccounts(a.accounts.filter(acc => ['credit_card', 'loan'].includes(acc.type)));
    }).finally(() => setLoading(false));
  }, []);

  const fetchDebts = async () => { const { debts } = await api.getDebts(); setDebts(debts); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createDebt({
      accountId: form.accountId, name: form.name,
      originalBalance: parseFloat(form.originalBalance), currentBalance: parseFloat(form.currentBalance),
      interestRate: parseFloat(form.interestRate), minimumPayment: parseFloat(form.minimumPayment),
    });
    setShowForm(false); fetchDebts();
  };

  const runCalculator = async () => {
    try {
      const { result } = await api.getDebtCompare(extraPayment);
      setComparison(result);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (showCalculator && debts.length > 0) runCalculator();
  }, [showCalculator, extraPayment]);

  const totalDebt = debts.reduce((s, d) => s + d.currentBalance, 0);
  const totalMinimum = debts.reduce((s, d) => s + d.minimumPayment, 0);

  // Derived from comparison result
  const attackDebtId = comparison?.avalanche.debtPayoffOrder[0]?.id;
  const attackDebt = attackDebtId ? debts.find(d => d.id === attackDebtId) : null;
  const minimumDebts = comparison ? debts.filter(d => d.id !== attackDebtId) : [];

  // Month 1 payment breakdown from avalanche schedule
  const month1Debts = comparison?.avalanche.schedule[0]?.debts ?? [];
  const attackMonth1 = month1Debts.find((m: any) => m.id === attackDebtId);
  const attackMinimum = attackDebt?.minimumPayment ?? 0;
  const attackExtra = attackMonth1 ? Math.max(0, attackMonth1.payment - attackMinimum) : extraPayment;

  // Payoff date
  const payoffDate = comparison ? (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + comparison.avalanche.months);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  })() : null;

  if (loading) return <div className="flex items-center justify-center h-64">Loading debts...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Debt Tracker</h1><p className="text-[hsl(var(--muted-foreground))]">Track and plan debt payoff</p></div>
        <div className="flex gap-2">
          {debts.length > 0 && (
            <Button variant="outline" onClick={() => setShowCalculator(!showCalculator)}>
              <Calculator className="h-4 w-4 mr-2" />{showCalculator ? 'Hide Plan' : 'Payoff Plan'}
            </Button>
          )}
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? <><X className="h-4 w-4 mr-2" />Cancel</> : <><Plus className="h-4 w-4 mr-2" />Add Debt</>}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-[hsl(var(--muted-foreground))]">Total Debt</p><p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalDebt)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-[hsl(var(--muted-foreground))]">Monthly Minimums</p><p className="text-2xl font-bold">{formatCurrency(totalMinimum)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-[hsl(var(--muted-foreground))]">Number of Debts</p><p className="text-2xl font-bold">{debts.length}</p></CardContent></Card>
      </div>

      {/* Payoff Action Plan */}
      {showCalculator && comparison && (
        <div className="space-y-4">
          <Card className="border-2 border-blue-500 dark:border-blue-400">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                Your Debt Payoff Action Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Extra payment slider */}
              <div>
                <label className="text-sm font-medium block mb-2">Extra Monthly Payment: {formatCurrency(extraPayment)}</label>
                <input type="range" min="0" max="2000" step="25" value={extraPayment}
                  onChange={(e) => setExtraPayment(parseInt(e.target.value))}
                  className="w-full h-2 bg-[hsl(var(--secondary))] rounded-lg appearance-none cursor-pointer" />
                <div className="flex justify-between text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  <span>$0</span><span>$500</span><span>$1,000</span><span>$1,500</span><span>$2,000</span>
                </div>
              </div>

              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Using <span className="font-semibold text-blue-600 dark:text-blue-400">Avalanche strategy</span> (highest interest rate first — saves the most money)
              </p>

              {/* Attack debt */}
              {attackDebt && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">🎯 ATTACK THIS DEBT FIRST:</span>
                    <Badge variant="default" className="bg-blue-600 text-xs">Focus here</Badge>
                  </div>
                  <p className="font-semibold text-lg">{attackDebt.name} — {attackDebt.interestRate}% APR</p>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                    Pay: <span className="font-medium text-[hsl(var(--foreground))]">{formatCurrency(attackMinimum)}</span> minimum
                    {extraPayment > 0 && <> + <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(attackExtra)}</span> extra = <span className="font-bold">{formatCurrency(attackMinimum + attackExtra)}</span> this month</>}
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Balance: {formatCurrency(attackDebt.currentBalance)}</p>
                </div>
              )}

              {/* Minimum only debts */}
              {minimumDebts.length > 0 && (
                <div className="p-4 bg-[hsl(var(--secondary))] rounded-lg">
                  <p className="font-semibold text-sm mb-2">✅ PAY MINIMUM ONLY ON THESE:</p>
                  <div className="space-y-1.5">
                    {minimumDebts.map(d => (
                      <div key={d.id} className="flex justify-between items-center text-sm">
                        <span>{d.name}</span>
                        <span className="font-medium">{formatCurrency(d.minimumPayment)}/mo</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="text-center p-3 bg-[hsl(var(--secondary))] rounded-lg">
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">📅 Debt-free by</p>
                  <p className="font-bold">{payoffDate}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">({comparison.avalanche.months} months)</p>
                </div>
                <div className="text-center p-3 bg-[hsl(var(--secondary))] rounded-lg">
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">💰 Total interest</p>
                  <p className="font-bold text-red-600 dark:text-red-400">{formatCurrency(comparison.avalanche.totalInterest)}</p>
                </div>
                {comparison.interestSaved > 0 && (
                  <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">💡 vs. Snowball saves</p>
                    <p className="font-bold text-green-600 dark:text-green-400">{formatCurrency(comparison.interestSaved)}</p>
                    {comparison.monthsSaved > 0 && <p className="text-xs text-[hsl(var(--muted-foreground))]">&amp; {comparison.monthsSaved} months</p>}
                  </div>
                )}
              </div>

              {/* Collapsible month-by-month schedule */}
              <div>
                <button
                  className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                  onClick={() => setShowSchedule(s => !s)}
                >
                  {showSchedule ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Month-by-Month Schedule (first 6 months)
                </button>
                {showSchedule && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-[hsl(var(--muted-foreground))] border-b">
                          <th className="pb-1 pr-4">Month</th>
                          <th className="pb-1 pr-4">Balance</th>
                          <th className="pb-1 pr-4">Payment</th>
                          <th className="pb-1">Interest</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparison.avalanche.schedule.slice(0, 6).map(row => (
                          <tr key={row.month} className="border-b border-[hsl(var(--border))]">
                            <td className="py-1.5 pr-4 font-medium">{row.month}</td>
                            <td className="py-1.5 pr-4">{formatCurrency(row.totalBalance)}</td>
                            <td className="py-1.5 pr-4">{formatCurrency(row.totalPayment)}</td>
                            <td className="py-1.5 text-red-600 dark:text-red-400">{formatCurrency(row.totalInterest)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Collapsible balance chart */}
              <div>
                <button
                  className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                  onClick={() => setShowChart(s => !s)}
                >
                  {showChart ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Balance Over Time Chart
                </button>
                {showChart && (
                  <div className="mt-3">
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" type="number" domain={[0, 'dataMax']} label={{ value: 'Months', position: 'bottom' }} />
                        <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number | undefined) => formatCurrency(v ?? 0)} labelFormatter={(l) => `Month ${l}`} />
                        <Legend />
                        <Line data={comparison.avalanche.schedule} dataKey="totalBalance" stroke="#3b82f6" name="Avalanche" dot={false} strokeWidth={2} />
                        <Line data={comparison.snowball.schedule} dataKey="totalBalance" stroke="#22c55e" name="Snowball" dot={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showForm && (
        <Card><CardHeader><CardTitle>Add Debt</CardTitle></CardHeader><CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm font-medium">Account</label><Select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} required><option value="">Select account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></div>
              <div className="space-y-2"><label className="text-sm font-medium">Debt Name</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Original Balance</label><Input type="number" step="0.01" value={form.originalBalance} onChange={(e) => setForm({ ...form, originalBalance: e.target.value })} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Current Balance</label><Input type="number" step="0.01" value={form.currentBalance} onChange={(e) => setForm({ ...form, currentBalance: e.target.value })} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Interest Rate (%)</label><Input type="number" step="0.01" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Minimum Payment</label><Input type="number" step="0.01" value={form.minimumPayment} onChange={(e) => setForm({ ...form, minimumPayment: e.target.value })} required /></div>
            </div>
            <Button type="submit">Add Debt</Button>
          </form>
        </CardContent></Card>
      )}

      <div className="space-y-4">
        {debts.map(d => (
          <Card key={d.id}><CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-red-600 dark:text-red-400" />
                <div><h3 className="font-semibold">{d.name}</h3><p className="text-sm text-[hsl(var(--muted-foreground))]">{d.account?.institution} &middot; {d.interestRate}% APR</p></div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(d.currentBalance)}</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Min: {formatCurrency(d.minimumPayment)}/mo</p>
              </div>
            </div>
            <div className="mt-4 w-full bg-[hsl(var(--secondary))] rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full transition-all" style={{ width: `${Math.max(0, ((d.originalBalance - d.currentBalance) / d.originalBalance) * 100)}%` }} />
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{((d.originalBalance - d.currentBalance) / d.originalBalance * 100).toFixed(1)}% paid off</p>
          </CardContent></Card>
        ))}
      </div>

      {debts.length === 0 && !showForm && (
        <Card><CardContent className="p-12 text-center">
          <CreditCard className="h-12 w-12 mx-auto text-[hsl(var(--muted-foreground))] mb-4" />
          <h3 className="text-lg font-semibold mb-2">No debts tracked</h3>
          <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" /> Add Debt</Button>
        </CardContent></Card>
      )}
    </div>
  );
}
