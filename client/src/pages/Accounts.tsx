import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Account } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { formatCurrency } from '../lib/utils';
import { Plus, X, Building2, CreditCard, Car, TrendingUp, Banknote } from 'lucide-react';

const typeIcons: Record<string, any> = { bank: Building2, credit_card: CreditCard, loan: Car, investment: TrendingUp, income: Banknote };
const typeColors: Record<string, string> = { bank: 'text-blue-600', credit_card: 'text-red-600', loan: 'text-orange-600', investment: 'text-green-600', income: 'text-purple-600' };
const institutions = ['USAA', 'Navy Federal', 'Capital One', 'Citibank', 'Bridgecrest', 'Guideline', 'TSP', 'VA', 'Other'];

export function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', institution: '', type: 'bank', subtype: '', balance: '', creditLimit: '', interestRate: '', minimumPayment: '', accountNumber: '' });
  const [error, setError] = useState('');

  const fetchAccounts = async () => {
    try { const { accounts } = await api.getAccounts(); setAccounts(accounts); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      await api.createAccount({
        name: form.name, institution: form.institution, type: form.type as Account['type'],
        subtype: form.subtype || undefined, balance: parseFloat(form.balance) || 0,
        creditLimit: form.creditLimit ? parseFloat(form.creditLimit) : undefined,
        interestRate: form.interestRate ? parseFloat(form.interestRate) : undefined,
        minimumPayment: form.minimumPayment ? parseFloat(form.minimumPayment) : undefined,
        accountNumber: form.accountNumber || undefined,
      });
      setShowForm(false);
      setForm({ name: '', institution: '', type: 'bank', subtype: '', balance: '', creditLimit: '', interestRate: '', minimumPayment: '', accountNumber: '' });
      fetchAccounts();
    } catch (err: any) { setError(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this account?')) return;
    await api.deleteAccount(id); fetchAccounts();
  };

  const totalAssets = accounts.filter(a => ['bank', 'investment'].includes(a.type)).reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = accounts.filter(a => ['credit_card', 'loan'].includes(a.type)).reduce((s, a) => s + Math.abs(a.balance), 0);

  if (loading) return <div className="flex items-center justify-center h-64">Loading accounts...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Accounts</h1>
          <p className="text-[hsl(var(--muted-foreground))]">Manage your financial accounts</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X className="h-4 w-4 mr-2" />Cancel</> : <><Plus className="h-4 w-4 mr-2" />Add Account</>}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-[hsl(var(--muted-foreground))]">Total Assets</p><p className="text-2xl font-bold text-green-600">{formatCurrency(totalAssets)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-[hsl(var(--muted-foreground))]">Total Liabilities</p><p className="text-2xl font-bold text-red-600">{formatCurrency(totalLiabilities)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-[hsl(var(--muted-foreground))]">Net Worth</p><p className={`text-2xl font-bold ${totalAssets - totalLiabilities >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(totalAssets - totalLiabilities)}</p></CardContent></Card>
      </div>

      {showForm && (
        <Card><CardHeader><CardTitle>Add New Account</CardTitle></CardHeader><CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm font-medium">Account Name</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. USAA Checking" required /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Institution</label><Select value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} required><option value="">Select institution</option>{institutions.map(i => <option key={i} value={i}>{i}</option>)}</Select></div>
              <div className="space-y-2"><label className="text-sm font-medium">Account Type</label><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="bank">Bank Account</option><option value="credit_card">Credit Card</option><option value="loan">Loan</option><option value="investment">Investment</option><option value="income">Income Source</option></Select></div>
              <div className="space-y-2"><label className="text-sm font-medium">Subtype</label><Input value={form.subtype} onChange={(e) => setForm({ ...form, subtype: e.target.value })} placeholder="e.g. checking, savings, 401k" /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Current Balance</label><Input type="number" step="0.01" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} placeholder="0.00" required /></div>
              {form.type === 'credit_card' && <div className="space-y-2"><label className="text-sm font-medium">Credit Limit</label><Input type="number" step="0.01" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} /></div>}
              {['credit_card', 'loan'].includes(form.type) && (
                <>
                  <div className="space-y-2"><label className="text-sm font-medium">Interest Rate (%)</label><Input type="number" step="0.01" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} /></div>
                  <div className="space-y-2"><label className="text-sm font-medium">Minimum Payment</label><Input type="number" step="0.01" value={form.minimumPayment} onChange={(e) => setForm({ ...form, minimumPayment: e.target.value })} /></div>
                </>
              )}
              <div className="space-y-2"><label className="text-sm font-medium">Last 4 Digits (optional)</label><Input maxLength={4} value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} /></div>
            </div>
            <Button type="submit">Add Account</Button>
          </form>
        </CardContent></Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map((account) => {
          const Icon = typeIcons[account.type] || Building2;
          const color = typeColors[account.type] || 'text-gray-600';
          return (
            <Card key={account.id}><CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[hsl(var(--secondary))]"><Icon className={`h-5 w-5 ${color}`} /></div>
                  <div><h3 className="font-semibold">{account.name}</h3><p className="text-sm text-[hsl(var(--muted-foreground))]">{account.institution}</p></div>
                </div>
                <Badge variant={account.type === 'bank' ? 'default' : account.type === 'investment' ? 'success' : 'destructive'}>{account.type.replace('_', ' ')}</Badge>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Balance</p>
                  <p className={`text-xl font-bold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(Math.abs(account.balance))}</p>
                </div>
                <div className="flex gap-2">
                  {account.interestRate && <span className="text-xs text-[hsl(var(--muted-foreground))]">{account.interestRate}% APR</span>}
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(account.id)}>Delete</Button>
                </div>
              </div>
            </CardContent></Card>
          );
        })}
      </div>

      {accounts.length === 0 && (
        <Card><CardContent className="p-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-[hsl(var(--muted-foreground))] mb-4" />
          <h3 className="text-lg font-semibold mb-2">No accounts yet</h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-4">Add your first financial account to get started</p>
          <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" /> Add Account</Button>
        </CardContent></Card>
      )}
    </div>
  );
}
