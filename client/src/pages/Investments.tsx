import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Investment, Account, InvestmentProjection } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { formatCurrency } from '../lib/utils';
import { Plus, X, TrendingUp, Calculator } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line } from 'recharts';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function Investments() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showProjector, setShowProjector] = useState(false);
  const [form, setForm] = useState({ accountId: '', name: '', currentValue: '', monthlyContribution: '', employerMatch: '', returnRate: '' });

  // Projection state
  const [projYears, setProjYears] = useState(30);
  const [projReturn, setProjReturn] = useState(7);
  const [projMonthly, setProjMonthly] = useState(0);
  const [projInitial, setProjInitial] = useState(0);
  const [projection, setProjection] = useState<InvestmentProjection[]>([]);
  const [monteCarlo, setMonteCarlo] = useState<any[]>([]);
  const [, setProjLoading] = useState(false);

  useEffect(() => {
    Promise.all([api.getInvestments(), api.getAccounts()]).then(([i, a]) => {
      setInvestments(i.investments);
      setAccounts(a.accounts.filter(acc => acc.type === 'investment'));
      const totalVal = i.investments.reduce((s: number, inv: Investment) => s + inv.currentValue, 0);
      const totalContrib = i.investments.reduce((s: number, inv: Investment) => s + inv.monthlyContribution, 0);
      setProjInitial(totalVal);
      setProjMonthly(totalContrib);
    }).finally(() => setLoading(false));
  }, []);

  const fetchInvestments = async () => { const { investments } = await api.getInvestments(); setInvestments(investments); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createInvestment({
      accountId: form.accountId, name: form.name,
      currentValue: parseFloat(form.currentValue),
      monthlyContribution: form.monthlyContribution ? parseFloat(form.monthlyContribution) : 0,
      employerMatch: form.employerMatch ? parseFloat(form.employerMatch) : undefined,
      returnRate: form.returnRate ? parseFloat(form.returnRate) : undefined,
    });
    setShowForm(false); fetchInvestments();
  };

  const runProjection = async () => {
    setProjLoading(true);
    try {
      const res = await api.getInvestmentGrowth({
        years: projYears, annualReturn: projReturn,
        monthlyContribution: projMonthly, initialBalance: projInitial,
      });
      setProjection(res.projection);
      setMonteCarlo(res.monteCarlo);
    } catch (err) { console.error(err); }
    finally { setProjLoading(false); }
  };

  useEffect(() => {
    if (showProjector) runProjection();
  }, [showProjector, projYears, projReturn, projMonthly, projInitial]);

  const totalValue = investments.reduce((s, i) => s + i.currentValue, 0);
  const totalContributions = investments.reduce((s, i) => s + i.monthlyContribution, 0);
  const pieData = investments.map(i => ({ name: i.name, value: i.currentValue }));

  if (loading) return <div className="flex items-center justify-center h-64">Loading investments...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Investments</h1><p className="text-[hsl(var(--muted-foreground))]">Track your investment portfolio</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowProjector(!showProjector)}>
            <Calculator className="h-4 w-4 mr-2" />{showProjector ? 'Hide Projector' : 'Growth Projector'}
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? <><X className="h-4 w-4 mr-2" />Cancel</> : <><Plus className="h-4 w-4 mr-2" />Add Investment</>}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-[hsl(var(--muted-foreground))]">Total Portfolio</p><p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalValue)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-[hsl(var(--muted-foreground))]">Monthly Contributions</p><p className="text-2xl font-bold">{formatCurrency(totalContributions)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-[hsl(var(--muted-foreground))]">Annual Contributions</p><p className="text-2xl font-bold">{formatCurrency(totalContributions * 12)}</p></CardContent></Card>
      </div>

      {/* Investment Growth Projector */}
      {showProjector && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5" />Retirement Growth Projector</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Starting Balance</label>
                  <Input type="number" value={projInitial} onChange={(e) => setProjInitial(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Monthly Contribution</label>
                  <Input type="number" value={projMonthly} onChange={(e) => setProjMonthly(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Expected Return (%)</label>
                  <Input type="number" step="0.5" value={projReturn} onChange={(e) => setProjReturn(parseFloat(e.target.value) || 7)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Years</label>
                  <Input type="number" value={projYears} onChange={(e) => setProjYears(parseInt(e.target.value) || 30)} />
                </div>
              </div>

              {projection.length > 0 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30"><CardContent className="p-4">
                      <p className="text-sm text-green-800 dark:text-green-200">Projected Value ({projYears}yr)</p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrency(projection[projection.length - 1]!.balance)}</p>
                    </CardContent></Card>
                    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30"><CardContent className="p-4">
                      <p className="text-sm text-blue-800 dark:text-blue-200">Total Contributions</p>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(projection[projection.length - 1]!.contributions)}</p>
                    </CardContent></Card>
                    <Card className="border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30"><CardContent className="p-4">
                      <p className="text-sm text-purple-800 dark:text-purple-200">Investment Growth</p>
                      <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{formatCurrency(projection[projection.length - 1]!.growth)}</p>
                    </CardContent></Card>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Growth Over Time</h4>
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={projection}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" label={{ value: 'Years', position: 'bottom' }} />
                        <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number | undefined) => formatCurrency(v ?? 0)} labelFormatter={(l) => `Year ${l}`} />
                        <Legend />
                        <Area type="monotone" dataKey="growth" stackId="1" fill="#8b5cf6" stroke="#8b5cf6" name="Growth" fillOpacity={0.6} />
                        <Area type="monotone" dataKey="contributions" stackId="1" fill="#3b82f6" stroke="#3b82f6" name="Contributions" fillOpacity={0.6} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Monte Carlo */}
                  {monteCarlo.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Monte Carlo Simulation (Best / Expected / Worst)</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={monteCarlo}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" />
                          <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(v: number | undefined) => formatCurrency(v ?? 0)} labelFormatter={(l) => `Year ${l}`} />
                          <Legend />
                          <Line dataKey="conservative.mid" stroke="#22c55e" name="Conservative (5%)" dot={false} />
                          <Line dataKey="moderate.mid" stroke="#3b82f6" name="Moderate (7%)" dot={false} strokeWidth={2} />
                          <Line dataKey="aggressive.mid" stroke="#ef4444" name="Aggressive (10%)" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-3 gap-4 mt-4 text-center text-sm">
                        <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                          <p className="text-green-800 dark:text-green-200 font-medium">Conservative (5%)</p>
                          <p className="text-lg font-bold text-green-700 dark:text-green-300">{formatCurrency(monteCarlo[monteCarlo.length - 1]?.conservative.mid || 0)}</p>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                          <p className="text-blue-800 dark:text-blue-200 font-medium">Moderate (7%)</p>
                          <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatCurrency(monteCarlo[monteCarlo.length - 1]?.moderate.mid || 0)}</p>
                        </div>
                        <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                          <p className="text-red-800 dark:text-red-200 font-medium">Aggressive (10%)</p>
                          <p className="text-lg font-bold text-red-700 dark:text-red-300">{formatCurrency(monteCarlo[monteCarlo.length - 1]?.aggressive.mid || 0)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {pieData.length > 0 && (
        <Card><CardHeader><CardTitle className="text-lg">Portfolio Allocation</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number | undefined) => formatCurrency(v ?? 0)} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent></Card>
      )}

      {showForm && (
        <Card><CardHeader><CardTitle>Add Investment</CardTitle></CardHeader><CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm font-medium">Account</label><Select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} required><option value="">Select account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></div>
              <div className="space-y-2"><label className="text-sm font-medium">Investment Name</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Current Value</label><Input type="number" step="0.01" value={form.currentValue} onChange={(e) => setForm({ ...form, currentValue: e.target.value })} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Monthly Contribution</label><Input type="number" step="0.01" value={form.monthlyContribution} onChange={(e) => setForm({ ...form, monthlyContribution: e.target.value })} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Employer Match (%)</label><Input type="number" step="0.1" value={form.employerMatch} onChange={(e) => setForm({ ...form, employerMatch: e.target.value })} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Expected Return Rate (%)</label><Input type="number" step="0.1" value={form.returnRate} onChange={(e) => setForm({ ...form, returnRate: e.target.value })} /></div>
            </div>
            <Button type="submit">Add Investment</Button>
          </form>
        </CardContent></Card>
      )}

      <div className="space-y-4">
        {investments.map(inv => (
          <Card key={inv.id}><CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div><h3 className="font-semibold">{inv.name}</h3><p className="text-sm text-[hsl(var(--muted-foreground))]">{inv.account?.institution}</p></div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(inv.currentValue)}</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{formatCurrency(inv.monthlyContribution)}/mo{inv.employerMatch ? ` + ${inv.employerMatch}% match` : ''}</p>
              </div>
            </div>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
