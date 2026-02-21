import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Budget, CategorySpending } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { formatCurrency } from '../lib/utils';
import { Plus, X, Target } from 'lucide-react';

export function Budgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [spending, setSpending] = useState<CategorySpending[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: '', amount: '' });

  useEffect(() => {
    Promise.all([api.getBudgets(), api.getSpendingByCategory()]).then(([b, s]) => {
      setBudgets(b.budgets); setSpending(s.categories);
    }).finally(() => setLoading(false));
  }, []);

  const fetchBudgets = async () => { const { budgets } = await api.getBudgets(); setBudgets(budgets); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createBudget({ category: form.category, amount: parseFloat(form.amount) });
    setShowForm(false); setForm({ category: '', amount: '' }); fetchBudgets();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this budget?')) return;
    await api.deleteBudget(id); fetchBudgets();
  };

  const getSpentAmount = (category: string) => spending.find(s => s.category === category)?.amount || 0;
  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = spending.reduce((s, c) => s + c.amount, 0);

  if (loading) return <div className="flex items-center justify-center h-64">Loading budgets...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Budgets</h1><p className="text-[hsl(var(--muted-foreground))]">Track spending against your budgets</p></div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X className="h-4 w-4 mr-2" />Cancel</> : <><Plus className="h-4 w-4 mr-2" />Add Budget</>}
        </Button>
      </div>

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

      <div className="space-y-3">
        {budgets.map(b => {
          const spent = getSpentAmount(b.category);
          const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
          const over = pct > 100;
          return (
            <Card key={b.id}><CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"><Target className="h-4 w-4 text-[hsl(var(--muted-foreground))]" /><span className="font-medium">{b.category}</span></div>
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-medium ${over ? 'text-red-600 dark:text-red-400' : ''}`}>{formatCurrency(spent)} / {formatCurrency(b.amount)}</span>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(b.id)} className="text-[hsl(var(--muted-foreground))]"><X className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="w-full bg-[hsl(var(--secondary))] rounded-full h-2">
                <div className={`h-2 rounded-full transition-all ${over ? 'bg-red-600' : pct > 80 ? 'bg-yellow-500' : 'bg-green-600'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{pct.toFixed(0)}% used &middot; {formatCurrency(Math.max(0, b.amount - spent))} remaining</p>
            </CardContent></Card>
          );
        })}
      </div>
    </div>
  );
}
