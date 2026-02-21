import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { ApiKeyInfo, AuditLogEntry, LoginAttemptEntry, SecurityStatus } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Shield, Key, ScrollText, Lock, AlertTriangle, CheckCircle, Eye, EyeOff, Copy, Trash2, Clock, Activity } from 'lucide-react';

type Tab = 'security' | 'apikeys' | 'audit' | 'password';

export function Settings() {
  const [tab, setTab] = useState<Tab>('security');

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'security', label: 'Security Dashboard', icon: Shield },
    { id: 'apikeys', label: 'API Keys', icon: Key },
    { id: 'audit', label: 'Audit Log', icon: ScrollText },
    { id: 'password', label: 'Change Password', icon: Lock },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-[hsl(var(--muted-foreground))]">Security, API keys, and account settings</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <Button key={t.id} variant={tab === t.id ? 'default' : 'outline'} size="sm" onClick={() => setTab(t.id)}>
              <Icon className="h-4 w-4 mr-2" />{t.label}
            </Button>
          );
        })}
      </div>

      {tab === 'security' && <SecurityDashboard />}
      {tab === 'apikeys' && <ApiKeyManager />}
      {tab === 'audit' && <AuditLogViewer />}
      {tab === 'password' && <PasswordChange />}
    </div>
  );
}

function SecurityDashboard() {
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [loginHistory, setLoginHistory] = useState<LoginAttemptEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getSecurityStatus(), api.getLoginHistory()])
      .then(([s, l]) => { setStatus(s.security); setLoginHistory(l.attempts); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64">Loading security status...</div>;
  if (!status) return <div className="text-[hsl(var(--muted-foreground))]">Failed to load security status</div>;

  return (
    <div className="space-y-4">
      {/* Security overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Shield className={`h-8 w-8 mx-auto mb-2 ${status.encryptionEnabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
            <p className="text-sm font-medium">Encryption</p>
            <Badge variant={status.encryptionEnabled ? 'success' : 'destructive'}>
              {status.encryptionEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Key className="h-8 w-8 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-medium">Active API Keys</p>
            <p className="text-2xl font-bold">{status.activeApiKeys}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className={`h-8 w-8 mx-auto mb-2 ${status.recentFailedLogins > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`} />
            <p className="text-sm font-medium">Failed Logins (24h)</p>
            <p className="text-2xl font-bold">{status.recentFailedLogins}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="h-8 w-8 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
            <p className="text-sm font-medium">Audit Actions (24h)</p>
            <p className="text-2xl font-bold">{status.recentAuditActions}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Security Recommendations</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {status.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2">
                {rec.includes('good') || rec.includes('passed') ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                )}
                <span className="text-sm">{rec}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Recent Login History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Login Activity</CardTitle>
          <CardDescription>Last 50 login attempts</CardDescription>
        </CardHeader>
        <CardContent>
          {loginHistory.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">No login history recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-[hsl(var(--muted))]">
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">IP Address</th>
                    <th className="p-2 text-left">Reason</th>
                    <th className="p-2 text-left">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {loginHistory.slice(0, 20).map(a => (
                    <tr key={a.id} className="border-b">
                      <td className="p-2">
                        <Badge variant={a.success ? 'success' : 'destructive'} className="text-xs">
                          {a.success ? 'Success' : 'Failed'}
                        </Badge>
                      </td>
                      <td className="p-2 font-mono text-xs">{a.email}</td>
                      <td className="p-2 font-mono text-xs">{a.ipAddress || '—'}</td>
                      <td className="p-2 text-xs text-[hsl(var(--muted-foreground))]">{a.reason || '—'}</td>
                      <td className="p-2 text-xs">{new Date(a.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState('read');
  const [newKeyExpiry, setNewKeyExpiry] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadKeys = () => {
    api.getApiKeys()
      .then(r => setKeys(r.apiKeys))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadKeys(); }, []);

  const handleCreate = async () => {
    if (!newKeyName.trim()) { setError('Name is required'); return; }
    setError('');
    try {
      const result = await api.createApiKey({
        name: newKeyName,
        permissions: newKeyPermissions,
        expiresInDays: newKeyExpiry ? parseInt(newKeyExpiry) : undefined,
      });
      setCreatedKey(result.rawKey);
      setNewKeyName('');
      setShowCreate(false);
      loadKeys();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await api.revokeApiKey(id);
      loadKeys();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading API keys...</div>;

  return (
    <div className="space-y-4">
      {createdKey && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-green-800 dark:text-green-200">API Key Created</p>
                <p className="text-xs text-green-700 dark:text-green-300 mb-2">Copy this key now — it will not be shown again.</p>
                <div className="flex items-center gap-2">
                  <code className="bg-[hsl(var(--background))] border rounded px-3 py-1 text-sm font-mono flex-1 break-all">{createdKey}</code>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(createdKey)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setCreatedKey(null)}>Dismiss</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">{error}</div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">API Keys</CardTitle>
              <CardDescription>Programmatic access to your financial data</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
              {showCreate ? 'Cancel' : 'Create Key'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showCreate && (
            <div className="mb-4 p-4 border rounded-lg space-y-3 bg-[hsl(var(--muted))]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium">Name</label>
                  <Input placeholder="e.g. My Script" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium">Permissions</label>
                  <Select value={newKeyPermissions} onChange={e => setNewKeyPermissions(e.target.value)}>
                    <option value="read">Read Only</option>
                    <option value="read,write">Read + Write</option>
                    <option value="admin">Admin</option>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">Expires In (days)</label>
                  <Input type="number" placeholder="Never" value={newKeyExpiry} onChange={e => setNewKeyExpiry(e.target.value)} />
                </div>
              </div>
              <Button size="sm" onClick={handleCreate}>Generate Key</Button>
            </div>
          )}

          {keys.length === 0 ? (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">No API keys created yet.</p>
          ) : (
            <div className="space-y-2">
              {keys.map(k => (
                <div key={k.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Key className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    <div>
                      <p className="text-sm font-medium">{k.name}</p>
                      <p className="text-xs font-mono text-[hsl(var(--muted-foreground))]">{k.keyPrefix}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{k.permissions}</Badge>
                    <Badge variant={k.isActive ? 'success' : 'destructive'}>
                      {k.isActive ? 'Active' : 'Revoked'}
                    </Badge>
                    {k.lastUsedAt && (
                      <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                        <Clock className="h-3 w-3" />{new Date(k.lastUsedAt).toLocaleDateString()}
                      </span>
                    )}
                    {k.isActive && (
                      <Button variant="ghost" size="sm" onClick={() => handleRevoke(k.id)}>
                        <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">API Usage</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>Use your API key in the <code className="bg-[hsl(var(--muted))] px-1 rounded">X-API-Key</code> header:</p>
          <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto">
{`curl -H "X-API-Key: fincmd_YOUR_KEY_HERE" \\
     http://localhost:3001/api/accounts`}
          </pre>
          <p className="text-[hsl(var(--muted-foreground))]">API keys bypass CSRF protection and session cookies. Rate limits: 1000 requests/minute.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const loadLogs = (params?: Record<string, string>) => {
    setLoading(true);
    api.getAuditLog(params)
      .then(r => { setLogs(r.logs); setTotal(r.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadLogs(); }, []);

  const handleFilter = () => {
    if (filter) {
      loadLogs({ action: filter });
    } else {
      loadLogs();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Audit Log</CardTitle>
        <CardDescription>Record of all data modifications ({total} total events)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input placeholder="Filter by action..." value={filter} onChange={e => setFilter(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleFilter()} className="max-w-xs" />
          <Button variant="outline" size="sm" onClick={handleFilter}>Filter</Button>
          <Button variant="ghost" size="sm" onClick={() => { setFilter(''); loadLogs(); }}>Clear</Button>
        </div>

        {loading ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">No audit events recorded yet. Actions will appear here as you use the app.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-[hsl(var(--muted))]">
                  <th className="p-2 text-left">Time</th>
                  <th className="p-2 text-left">Action</th>
                  <th className="p-2 text-left">Resource</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">IP</th>
                  <th className="p-2 text-left">Request ID</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b hover:bg-[hsl(var(--muted)/0.3)]">
                    <td className="p-2 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="p-2 font-mono">{log.action}</td>
                    <td className="p-2">{log.resource}{log.resourceId ? ` / ${log.resourceId.substring(0, 8)}...` : ''}</td>
                    <td className="p-2">
                      <Badge variant={log.status < 400 ? 'success' : 'destructive'} className="text-xs">
                        {log.status}
                      </Badge>
                    </td>
                    <td className="p-2 font-mono">{log.ipAddress || '—'}</td>
                    <td className="p-2 font-mono text-[hsl(var(--muted-foreground))]">{log.requestId?.substring(0, 8) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PasswordChange() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordRequirements = [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
    { label: 'One special character', test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const result = await api.changePassword(currentPassword, newPassword);
      setMessage(result.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-lg">Change Password</CardTitle>
        <CardDescription>Update your account password</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {message && (
            <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="h-5 w-5" /><span className="text-sm">{message}</span>
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertTriangle className="h-5 w-5" /><span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Current Password</label>
            <div className="relative">
              <Input type={showPasswords ? 'text' : 'password'} value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">New Password</label>
            <div className="relative">
              <Input type={showPasswords ? 'text' : 'password'} value={newPassword}
                onChange={e => setNewPassword(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Confirm New Password</label>
            <Input type={showPasswords ? 'text' : 'password'} value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} required />
          </div>

          <button type="button" className="text-xs text-[hsl(var(--primary))] flex items-center gap-1"
            onClick={() => setShowPasswords(!showPasswords)}>
            {showPasswords ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showPasswords ? 'Hide' : 'Show'} passwords
          </button>

          {/* Password strength indicators */}
          {newPassword && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Password Requirements:</p>
              {passwordRequirements.map((req, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {req.test(newPassword) ? (
                    <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-red-500 dark:text-red-400" />
                  )}
                  <span className={req.test(newPassword) ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{req.label}</span>
                </div>
              ))}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Changing...' : 'Change Password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
