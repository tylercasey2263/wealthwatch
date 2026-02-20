import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Account } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { FileText, CheckCircle, AlertCircle, Building2, ArrowRight } from 'lucide-react';

interface Provider {
  id: string; name: string; type: string; method: string; status: string;
}

export function Import() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [step, setStep] = useState<'select' | 'upload' | 'map' | 'result'>('select');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<string[][]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [mapping, setMapping] = useState<Record<string, string>>({ date: '', description: '', amount: '', category: '', type: '' });
  const [result, setResult] = useState<{ imported: number; skipped: number; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getProviders(), api.getAccounts()])
      .then(([p, a]) => { setProviders(p.providers); setAccounts(a.accounts); })
      .catch(console.error);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvContent(text);
  };

  const handlePreview = async () => {
    if (!csvContent || !selectedAccount) {
      setError('Please select an account and upload a CSV file');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.importCSVPreview(csvContent);
      setHeaders(res.headers);
      setPreview(res.preview);
      setTotalRows(res.totalRows);

      // Auto-detect column mapping
      const autoMap: Record<string, string> = { date: '', description: '', amount: '', category: '', type: '' };
      for (const h of res.headers) {
        const lower = h.toLowerCase();
        if (lower.includes('date') || lower.includes('posted')) autoMap.date = h;
        else if (lower.includes('desc') || lower.includes('memo') || lower.includes('payee') || lower.includes('name')) autoMap.description = h;
        else if (lower.includes('amount') || lower.includes('debit') || lower.includes('credit')) autoMap.amount = h;
        else if (lower.includes('categ') || lower.includes('type')) autoMap.category = h;
      }
      setMapping(autoMap);
      setStep('map');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!mapping.date || !mapping.description || !mapping.amount) {
      setError('Date, Description, and Amount mappings are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.importCSV(selectedAccount, csvContent, mapping);
      setResult(res);
      setStep('result');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('select');
    setCsvContent('');
    setHeaders([]);
    setPreview([]);
    setMapping({ date: '', description: '', amount: '', category: '', type: '' });
    setResult(null);
    setError('');
    setSelectedAccount('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import Data</h1>
        <p className="text-[hsl(var(--muted-foreground))]">Import transactions from your financial institutions</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-sm">
        {['Select Account', 'Upload CSV', 'Map Columns', 'Done'].map((label, i) => {
          const stepMap = ['select', 'upload', 'map', 'result'];
          const currentIdx = stepMap.indexOf(step);
          const isActive = i <= currentIdx;
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <ArrowRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />}
              <span className={`px-2 py-1 rounded ${isActive ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" /><span className="text-sm">{error}</span>
        </div>
      )}

      {/* Step 1: Select Account + Provider info */}
      {(step === 'select' || step === 'upload') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Account</CardTitle>
              <CardDescription>Choose which account to import transactions into</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedAccount} onChange={(e) => { setSelectedAccount(e.target.value); setStep('upload'); }}>
                <option value="">Choose an account...</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.institution})</option>
                ))}
              </Select>

              {selectedAccount && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-[hsl(var(--muted))] rounded-lg">
                    <FileText className="h-5 w-5" />
                    <div>
                      <p className="font-medium text-sm">Upload CSV File</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">Export transactions from your bank as CSV</p>
                    </div>
                  </div>
                  <Input type="file" accept=".csv" onChange={handleFileUpload} />
                  {csvContent && (
                    <Button onClick={handlePreview} disabled={loading} className="w-full">
                      {loading ? 'Processing...' : 'Preview & Map Columns'}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />Supported Providers
              </CardTitle>
              <CardDescription>Institutions with import support</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {providers.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded border">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                      <span className="text-sm font-medium">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{p.method}</Badge>
                      <Badge variant={p.status === 'available' ? 'success' : 'warning'}>
                        {p.status === 'available' ? 'Available' : 'Coming Soon'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Map columns */}
      {step === 'map' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Map CSV Columns</CardTitle>
            <CardDescription>Match your CSV columns to transaction fields ({totalRows} rows found)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { key: 'date', label: 'Date *', required: true },
                { key: 'description', label: 'Description *', required: true },
                { key: 'amount', label: 'Amount *', required: true },
                { key: 'category', label: 'Category', required: false },
                { key: 'type', label: 'Type (income/expense)', required: false },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-sm font-medium">{field.label}</label>
                  <Select value={mapping[field.key] || ''} onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}>
                    <option value="">— skip —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    {headers.map(h => (
                      <th key={h} className="border p-2 bg-[hsl(var(--muted))] text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} className="border p-2">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={reset}>Cancel</Button>
              <Button onClick={handleImport} disabled={loading}>
                {loading ? 'Importing...' : `Import ${totalRows} Transactions`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Result */}
      {step === 'result' && result && (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
            <h2 className="text-2xl font-bold">Import Complete</h2>
            <div className="flex justify-center gap-6">
              <div>
                <p className="text-3xl font-bold text-green-600">{result.imported}</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Imported</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-yellow-600">{result.skipped}</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Skipped</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{result.total}</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Total</p>
              </div>
            </div>
            <Button onClick={reset}>Import More</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
