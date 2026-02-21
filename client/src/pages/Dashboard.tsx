import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { DashboardSummary, CategorySpending, MonthlyTrend } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { formatCurrency, formatPercent } from '../lib/utils';
import { TrendingUp, TrendingDown, DollarSign, CreditCard, PiggyBank, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1'];

export function Dashboard() {
  const { theme } = useTheme();
  const gridStroke = theme === 'dark' ? '#334155' : '#e2e8f0';
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [categories, setCategories] = useState<CategorySpending[]>([]);
  const [trend, setTrend] = useState<MonthlyTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getDashboardSummary(), api.getSpendingByCategory(), api.getMonthlyTrend(6)])
      .then(([s, c, t]) => { setSummary(s.summary); setCategories(c.categories); setTrend(t.trend); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64">Loading dashboard...</div>;
  if (!summary) return <div className="text-center text-[hsl(var(--muted-foreground))]">Failed to load dashboard</div>;

  const statCards = [
    { label: 'Net Worth', value: formatCurrency(summary.netWorth), icon: DollarSign, color: summary.netWorth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400' },
    { label: 'Monthly Income', value: formatCurrency(summary.monthlyIncome), icon: TrendingUp, color: 'text-green-600 dark:text-green-400' },
    { label: 'Monthly Expenses', value: formatCurrency(summary.monthlyExpenses), icon: TrendingDown, color: 'text-red-600 dark:text-red-400' },
    { label: 'Savings Rate', value: formatPercent(summary.savingsRate), icon: PiggyBank, color: summary.savingsRate >= 20 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400' },
    { label: 'Total Debt', value: formatCurrency(summary.totalDebt), icon: CreditCard, color: 'text-red-600 dark:text-red-400' },
    { label: 'Investments', value: formatCurrency(summary.totalInvestments), icon: BarChart3, color: 'text-blue-600 dark:text-blue-400' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-[hsl(var(--muted-foreground))]">Your financial overview at a glance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${stat.color} opacity-20`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Income vs Expenses</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number | undefined) => formatCurrency(value ?? 0)} />
                <Bar dataKey="income" fill="#22c55e" name="Income" />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Spending by Category</CardTitle></CardHeader>
          <CardContent>
            {categories.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={categories} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={100}
                    label={({ category, percent }: any) => `${category} ${(percent * 100).toFixed(0)}%`}>
                    {categories.map((_: any, index: number) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number | undefined) => formatCurrency(value ?? 0)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-[hsl(var(--muted-foreground))]">No spending data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Monthly Savings Trend</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number | undefined) => formatCurrency(value ?? 0)} />
              <Bar dataKey="savings" name="Net Savings">
                {trend.map((entry, index) => (
                  <Cell key={index} fill={entry.savings >= 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
