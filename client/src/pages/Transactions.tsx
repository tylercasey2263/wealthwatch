import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Transaction, Account } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { formatCurrency, formatDate } from '../lib/utils';
import { Plus, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const CATEGORIES = ['Housing', 'Transportation', 'Food & Dining', 'Utilities', 'Insurance', 'Entertainment', 'Shopping', 'Health & Fitness', 'Personal Care', 'Subscriptions', 'Salary', 'VA Disability', 'Side Income', 'Debt Payment', 'Transfer', 'Uncategorized'];

export function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState({ accountId: '', category: '', type: '' });
  const [form, setForm] = useState({ accountId: '', date: new Date().toISOString().split('T')[0], description: '', amount: '', category: 'Uncategorized', type: 'expense', notes: '' });
  const [error, setError] = useState('');

  const fetchTransactions = async () => {
    try {
      const params: Record<string, string> = {};
      if (filter.accountId) params.accountId = filter.accountId;
      if (filter.category) params.category = filter.category;
      if (filter.type) params.type = filter.type;
      const res = await api.getTransactions(params);
      setTransactions(res.transactions); setTotal(res.total);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { api.getAccounts().then(r => setAccounts(r.accounts)); }, []);
  useEffect(() => { fetchTransactions(); }, [filter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      const amount = parseFloat(form.amount);
      await api.createTransaction({
        accountId: form.accountId, date: form.date, description: form.description,
        amount: form.type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
        category: form.category, type: form.type as Transaction['type'], notes: form.notes || undefined,
      });
      setShowForm(false);
      setForm({ accountId: '', date: new Date().toISOString().split('T')[0], description: '', amount: '', category: 'Uncategorized', type: 'expense', notes: '' });
      fetchTransactions();
    } catch (err: any) { setError(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    await api.deleteTransaction(id); fetchTransactions();
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading transactions...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-[hsl(var(--muted-foreground))]">{total} transactions</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X className="h-4 w-4 mr-2" />Cancel</> : <><Plus className="h-4 w-4 mr-2" />Add Transaction</>}
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <Select value={filter.accountId} onChange={(e) => setFilter({ ...filter, accountId: e.target.value })} className="w-48"><option value="">All Accounts</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
        <Select value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })} className="w-48"><option value="">All Categories</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</Select>
        <Select value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })} className="w-40"><option value="">All Types</option><option value="income">Income</option><option value="expense">Expense</option><option value="transfer">Transfer</option></Select>
      </div>

      {showForm && (
        <Card><CardHeader><CardTitle>Add Transaction</CardTitle></CardHeader><CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-md">{error}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2"><label className="text-sm font-medium">Account</label><Select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} required><option value="">Select account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></div>
              <div className="space-y-2"><label className="text-sm font-medium">Date</label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Type</label><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="expense">Expense</option><option value="income">Income</option><option value="transfer">Transfer</option></Select></div>
              <div className="space-y-2"><label className="text-sm font-medium">Description</label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Grocery Store" required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Amount</label><Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Category</label><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</Select></div>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium">Notes (optional)</label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional details..." /></div>
            <Button type="submit">Add Transaction</Button>
          </form>
        </CardContent></Card>
      )}

      <Card><CardContent className="p-0"><div className="divide-y">
        {transactions.map((t) => (
          <div key={t.id} className="flex items-center justify-between p-4 hover:bg-[hsl(var(--accent))]/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${t.amount >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                {t.amount >= 0 ? <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" /> : <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />}
              </div>
              <div>
                <p className="font-medium">{t.description}</p>
                <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                  <span>{formatDate(t.date)}</span><span>&middot;</span><span>{t.account?.name}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{t.category}</Badge>
              <span className={`font-semibold ${t.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {t.amount >= 0 ? '+' : ''}{formatCurrency(t.amount)}
              </span>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)} className="text-[hsl(var(--muted-foreground))] hover:text-red-600"><X className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div></CardContent></Card>

      {transactions.length === 0 && (
        <Card><CardContent className="p-12 text-center"><p className="text-[hsl(var(--muted-foreground))]">No transactions found.</p></CardContent></Card>
      )}
    </div>
  );
}
