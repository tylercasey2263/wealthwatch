import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import type { Budget, CategorySpending, Transaction } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { formatCurrency } from '../lib/utils';
import { Plus, X, Target, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';

// Returns { start, end } for a given year/month (0-indexed month)
function monthRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);
  return { start, end };
}

function toISO(d: Date) { return d.toISOString(); }

function labelMonth(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function shortMonth(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export function Budgets() {
  const { theme } = useTheme();
  const gridStroke = theme === 'dark' ? '#334155' : '#e2e8f0';

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [spending, setSpending] = useState<CategorySpending[]>([]);
  const [loading, setLoading] = useState(true);
  const [spendingLoading, setSpendingLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: '', amount: '' });

  // Drill-down state
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const [drillTransactions, setDrillTransactions] = useState<Transaction[]>([]);
  const [drillTrend, setDrillTrend] = useState<{ month: string; spent: number }[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);

  const { start: monthStart, end: monthEnd } = monthRange(viewYear, viewMonth);

  const fetchSpending = useCallback(async (year: number, month: number) => {
    setSpendingLoading(true);
    const { start, end } = monthRange(year, month);
    const { categories } = await api.getSpendingByCategory({
      startDate: toISO(start),
      endDate: toISO(end),
    });
    setSpending(categories);
    setSpendingLoading(false);
  }, []);

  useEffect(() => {
    // Initial load: budgets once, spending for current month
    Promise.all([api.getBudgets(), api.getSpendingByCategory({
      startDate: toISO(monthStart),
      endDate: toISO(monthEnd),
    })]).then(([b, s]) => {
      setBudgets(b.budgets);
      setSpending(s.categories);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) fetchSpending(viewYear, viewMonth);
    // Close drill-down when navigating months
    setSelectedBudget(null);
    setDrillTransactions([]);
    setDrillTrend([]);
  }, [viewYear, viewMonth]);

  const goBack = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const goForward = () => {
    const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
    if (isCurrentMonth) return; // Don't go into future
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  const fetchBudgets = async () => { const { budgets } = await api.getBudgets(); setBudgets(budgets); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createBudget({ category: form.category, amount: parseFloat(form.amount) });
    setShowForm(false); setForm({ category: '', amount: '' }); fetchBudgets();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this budget?')) return;
    await api.deleteBudget(id); fetchBudgets();
    if (selectedBudget === id) setSelectedBudget(null);
  };

  const handleCardClick = async (budget: Budget) => {
    if (selectedBudget === budget.id) {
      setSelectedBudget(null);
      setDrillTransactions([]);
      setDrillTrend([]);
      return;
    }
    setSelectedBudget(budget.id);
    setDrillLoading(true);
    try {
      // 6-month trend: fetch transactions over the past 6 months for this category
      const trendStart = new Date(viewYear, viewMonth - 5, 1); // 5 months back from view month
      const trendEnd = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59);

      const { transactions: allTx } = await api.getTransactions({
        category: budget.category,
        startDate: toISO(trendStart),
        endDate: toISO(trendEnd),
        limit: '500',
      });

      // Aggregate by month for trend chart
      const monthMap: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const key = shortMonth(viewYear, viewMonth - i);
        monthMap[key] = 0;
      }
      for (const t of allTx) {
        const d = new Date(t.date);
        const key = shortMonth(d.getFullYear(), d.getMonth());
        if (key in monthMap) monthMap[key] = (monthMap[key] || 0) + Math.abs(t.amount);
      }
      setDrillTrend(Object.entries(monthMap).map(([month, spent]) => ({ month, spent })));

      // Current view-month transactions for the list
      const filtered = allTx.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
      });
      setDrillTransactions(filtered);
    } finally {
      setDrillLoading(false);
    }
  };

  const getSpentAmount = (category: string) => spending.find(s => s.category === category)?.amount || 0;
  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = spending.reduce((s, c) => s + c.amount, 0);

  if (loading) return <div className="flex items-center justify-center h-64">Loading budgets...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Budgets</h1>
          <p className="text-[hsl(var(--muted-foreground))]">Track spending against your budgets</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X className="h-4 w-4 mr-2" />Cancel</> : <><Plus className="h-4 w-4 mr-2" />Add Budget</>}
        </Button>
      </div>

      {/* Month navigator */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={goBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-lg min-w-[160px] text-center">
          {spendingLoading ? '…' : labelMonth(viewYear, viewMonth)}
        </span>
        <Button variant="outline" size="sm" onClick={goForward} disabled={isCurrentMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        {!isCurrentMonth && (
          <Button variant="ghost" size="sm" className="text-xs text-[hsl(var(--muted-foreground))]"
            onClick={() => { setViewYear(now.getFullYear()); setViewMonth(now.getMonth()); }}>
            Today
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-[hsl(var(--muted-foreground))]">Total Budget</p><p className="text-2xl font-bold">{formatCurrency(totalBudget)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-[hsl(var(--muted-foreground))]">Total Spent</p><p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalSpent)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-[hsl(var(--muted-foreground))]">Remaining</p><p className={`text-2xl font-bold ${totalBudget - totalSpent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(totalBudget - totalSpent)}</p></CardContent></Card>
      </div>

      {showForm && (
        <Card><CardHeader><CardTitle>Add Budget</CardTitle></CardHeader><CardContent>
          <form onSubmit={handleSubmit} className="flex gap-4 items-end">
            <div className="flex-1 space-y-2"><label className="text-sm font-medium">Category</label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Food & Dining" required /></div>
            <div className="w-48 space-y-2"><label className="text-sm font-medium">Monthly Amount</label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
            <Button type="submit">Add</Button>
          </form>
        </CardContent></Card>
      )}

      {/* Budget cards */}
      <div className="space-y-3">
        {budgets.map(b => {
          const spent = getSpentAmount(b.category);
          const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
          const over = pct > 100;
          const isExpanded = selectedBudget === b.id;
          return (
            <Card key={b.id} className={`transition-shadow ${isExpanded ? 'ring-2 ring-[hsl(var(--primary))]' : ''}`}>
              <CardContent className="p-4">
                {/* Clickable summary row */}
                <div
                  className="cursor-pointer select-none"
                  onClick={() => handleCardClick(b)}
                  role="button"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                      <span className="font-medium">{b.category}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-sm font-medium ${over ? 'text-red-600 dark:text-red-400' : ''}`}>{formatCurrency(spent)} / {formatCurrency(b.amount)}</span>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-[hsl(var(--muted-foreground))]" /> : <ChevronDown className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />}
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(b.id); }} className="text-[hsl(var(--muted-foreground))]">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="w-full bg-[hsl(var(--secondary))] rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${over ? 'bg-red-600' : pct > 80 ? 'bg-yellow-500' : 'bg-green-600'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{pct.toFixed(0)}% used &middot; {formatCurrency(Math.max(0, b.amount - spent))} remaining</p>
                </div>

                {/* Drill-down panel */}
                {isExpanded && (
                  <div className="mt-4 border-t pt-4 space-y-5">
                    {drillLoading ? (
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading...</p>
                    ) : (
                      <>
                        {/* 6-month trend chart */}
                        {drillTrend.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2 text-[hsl(var(--muted-foreground))]">6-Month Spending Trend</h4>
                            <ResponsiveContainer width="100%" height={180}>
                              <BarChart data={drillTrend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} width={50} />
                                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                                <ReferenceLine y={b.amount} stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'Budget', position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }} />
                                <Bar dataKey="spent" name="Spent" fill="#3b82f6" radius={[3, 3, 0, 0]}
                                  label={false} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        {/* Transaction list for selected month */}
                        <div>
                          <h4 className="text-sm font-semibold mb-2 text-[hsl(var(--muted-foreground))]">
                            {labelMonth(viewYear, viewMonth)} transactions
                          </h4>
                          {drillTransactions.length === 0 ? (
                            <p className="text-sm text-[hsl(var(--muted-foreground))]">No transactions this month for this category.</p>
                          ) : (
                            <>
                              <div className="space-y-0.5">
                                {drillTransactions.map(t => (
                                  <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-[hsl(var(--border))] last:border-0">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <span className="text-xs text-[hsl(var(--muted-foreground))] shrink-0">
                                        {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      </span>
                                      <span className="text-sm truncate">{t.description}</span>
                                    </div>
                                    <span className="text-sm font-medium text-red-600 dark:text-red-400 ml-4 shrink-0">{formatCurrency(Math.abs(t.amount))}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex justify-between mt-2 pt-2 border-t border-[hsl(var(--border))]">
                                <span className="text-xs text-[hsl(var(--muted-foreground))]">{drillTransactions.length} transaction{drillTransactions.length !== 1 ? 's' : ''}</span>
                                <span className="text-sm font-semibold">{formatCurrency(drillTransactions.reduce((s, t) => s + Math.abs(t.amount), 0))} total</span>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
