import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Goal, DebtCompareResult } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { formatCurrency } from '../lib/utils';
import { Plus, X, Target, CreditCard, PiggyBank, TrendingUp, CheckCircle2, Circle, Pencil, Trash2 } from 'lucide-react';

const GOAL_TYPES = [
  { value: 'debt_free', label: 'Debt-Free Date', icon: CreditCard, emoji: '💳' },
  { value: 'savings', label: 'Savings Target', icon: PiggyBank, emoji: '💰' },
  { value: 'emergency_fund', label: 'Emergency Fund', icon: PiggyBank, emoji: '🏦' },
  { value: 'investment', label: 'Investment Milestone', icon: TrendingUp, emoji: '📈' },
  { value: 'custom', label: 'Custom Goal', icon: Target, emoji: '🎯' },
] as const;

type GoalTypeValue = typeof GOAL_TYPES[number]['value'];

function getTypeInfo(type: string) {
  return GOAL_TYPES.find(t => t.value === type) || GOAL_TYPES[4];
}

function daysRemaining(targetDate: string | null | undefined): number | null {
  if (!targetDate) return null;
  const diff = new Date(targetDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

const BLANK_FORM = { title: '', type: 'savings' as GoalTypeValue, targetAmount: '', currentAmount: '', targetDate: '', notes: '' };

export function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [debtProjection, setDebtProjection] = useState<DebtCompareResult | null>(null);

  useEffect(() => {
    fetchGoals();
    // Pre-fetch debt projection for debt_free goal type
    api.getDebtCompare(0).then(({ result }) => setDebtProjection(result)).catch(() => {});
  }, []);

  const fetchGoals = async () => {
    try {
      const { goals } = await api.getGoals();
      setGoals(goals);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      title: form.title,
      type: form.type,
      targetAmount: form.targetAmount ? parseFloat(form.targetAmount) : null,
      currentAmount: form.currentAmount ? parseFloat(form.currentAmount) : 0,
      targetDate: form.targetDate || null,
      notes: form.notes || null,
    };
    if (editingGoal) {
      await api.updateGoal(editingGoal.id, data);
    } else {
      await api.createGoal(data);
    }
    setShowForm(false);
    setEditingGoal(null);
    setForm({ ...BLANK_FORM });
    fetchGoals();
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setForm({
      title: goal.title,
      type: goal.type as GoalTypeValue,
      targetAmount: goal.targetAmount != null ? String(goal.targetAmount) : '',
      currentAmount: String(goal.currentAmount),
      targetDate: goal.targetDate ? goal.targetDate.slice(0, 10) : '',
      notes: goal.notes || '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this goal?')) return;
    await api.deleteGoal(id);
    fetchGoals();
  };

  const handleToggleComplete = async (goal: Goal) => {
    await api.updateGoal(goal.id, { isCompleted: !goal.isCompleted });
    fetchGoals();
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingGoal(null);
    setForm({ ...BLANK_FORM });
  };

  // Pre-fill projected debt-free date when type changes to debt_free
  const handleTypeChange = (type: GoalTypeValue) => {
    const updates: Partial<typeof form> = { type };
    if (type === 'debt_free' && debtProjection && !form.targetDate) {
      const payoffDate = new Date();
      payoffDate.setMonth(payoffDate.getMonth() + debtProjection.avalanche.months);
      updates.targetDate = payoffDate.toISOString().slice(0, 10);
    }
    setForm(f => ({ ...f, ...updates }));
  };

  const activeGoals = goals.filter(g => !g.isCompleted);
  const completedGoals = goals.filter(g => g.isCompleted);
  const nearestDeadline = activeGoals
    .filter(g => g.targetDate)
    .sort((a, b) => new Date(a.targetDate!).getTime() - new Date(b.targetDate!).getTime())[0];

  if (loading) return <div className="flex items-center justify-center h-64">Loading goals...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Goals & Plan</h1>
          <p className="text-[hsl(var(--muted-foreground))]">Set targets and track your financial milestones</p>
        </div>
        <Button onClick={() => { cancelForm(); setShowForm(true); }}>
          {showForm && !editingGoal ? <><X className="h-4 w-4 mr-2" />Cancel</> : <><Plus className="h-4 w-4 mr-2" />Add Goal</>}
        </Button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Active Goals</p>
          <p className="text-2xl font-bold">{activeGoals.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Completed</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completedGoals.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Nearest Deadline</p>
          <p className="text-lg font-bold">{nearestDeadline ? formatDate(nearestDeadline.targetDate) : '—'}</p>
          {nearestDeadline && <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{nearestDeadline.title}</p>}
        </CardContent></Card>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingGoal ? 'Edit Goal' : 'New Goal'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Goal Title</label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Save $5,000 Emergency Fund" required maxLength={200} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select value={form.type} onChange={e => handleTypeChange(e.target.value as GoalTypeValue)} required>
                    {GOAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Date</label>
                  <Input type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Amount</label>
                  <Input type="number" step="0.01" min="0" value={form.targetAmount} onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))} placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Amount</label>
                  <Input type="number" step="0.01" min="0" value={form.currentAmount} onChange={e => setForm(f => ({ ...f, currentAmount: e.target.value }))} placeholder="0" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" maxLength={1000} />
                </div>
              </div>
              {/* Debt-free projection hint */}
              {form.type === 'debt_free' && debtProjection && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                  Projected debt-free: <strong>{formatDate(new Date(Date.now() + debtProjection.avalanche.months * 30.44 * 24 * 60 * 60 * 1000).toISOString())}</strong> ({debtProjection.avalanche.months} months at minimums). Date pre-filled above — adjust to set a stretch goal.
                </div>
              )}
              <div className="flex gap-2">
                <Button type="submit">{editingGoal ? 'Save Changes' : 'Add Goal'}</Button>
                <Button type="button" variant="outline" onClick={cancelForm}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Active Goals</h2>
          {activeGoals.map(goal => <GoalCard key={goal.id} goal={goal} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggleComplete} debtProjection={debtProjection} />)}
        </div>
      )}

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-[hsl(var(--muted-foreground))]">Completed</h2>
          {completedGoals.map(goal => <GoalCard key={goal.id} goal={goal} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggleComplete} debtProjection={debtProjection} />)}
        </div>
      )}

      {goals.length === 0 && !showForm && (
        <Card><CardContent className="p-12 text-center">
          <Target className="h-12 w-12 mx-auto text-[hsl(var(--muted-foreground))] mb-4" />
          <h3 className="text-lg font-semibold mb-2">No goals yet</h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">Set your first financial goal to start tracking your progress.</p>
          <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />Add Your First Goal</Button>
        </CardContent></Card>
      )}
    </div>
  );
}

function GoalCard({ goal, onEdit, onDelete, onToggle, debtProjection }: {
  goal: Goal;
  onEdit: (g: Goal) => void;
  onDelete: (id: string) => void;
  onToggle: (g: Goal) => void;
  debtProjection: DebtCompareResult | null;
}) {
  const typeInfo = getTypeInfo(goal.type);
  const days = daysRemaining(goal.targetDate);
  const pct = goal.targetAmount && goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : null;

  const isDebtFree = goal.type === 'debt_free';
  const projectedDate = isDebtFree && debtProjection
    ? new Date(Date.now() + debtProjection.avalanche.months * 30.44 * 24 * 60 * 60 * 1000)
    : null;

  return (
    <Card className={goal.isCompleted ? 'opacity-70' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <button onClick={() => onToggle(goal)} className="mt-0.5 shrink-0 text-[hsl(var(--muted-foreground))] hover:text-green-600 dark:hover:text-green-400 transition-colors">
              {goal.isCompleted ? <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" /> : <Circle className="h-5 w-5" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg">{typeInfo.emoji}</span>
                <h3 className={`font-semibold ${goal.isCompleted ? 'line-through text-[hsl(var(--muted-foreground))]' : ''}`}>{goal.title}</h3>
                <Badge variant="outline" className="text-xs">{typeInfo.label}</Badge>
                {goal.isCompleted && <Badge variant="default" className="text-xs bg-green-600">Done</Badge>}
              </div>

              {/* Progress bar */}
              {pct !== null && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-[hsl(var(--muted-foreground))] mb-1">
                    <span>{formatCurrency(goal.currentAmount)} saved</span>
                    <span>{formatCurrency(goal.targetAmount!)} target</span>
                  </div>
                  <div className="w-full bg-[hsl(var(--secondary))] rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${pct >= 100 ? 'bg-green-600' : pct >= 75 ? 'bg-blue-500' : 'bg-blue-400'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{pct.toFixed(0)}% complete</p>
                </div>
              )}

              {/* Debt-free dual projection */}
              {isDebtFree && projectedDate && (
                <div className="mt-2 text-xs text-[hsl(var(--muted-foreground))] space-y-0.5">
                  <p>Projected: <span className="font-medium text-[hsl(var(--foreground))]">{formatDate(projectedDate.toISOString())}</span> ({debtProjection!.avalanche.months}mo at minimums)</p>
                  {goal.targetDate && (
                    <p>Your goal: <span className="font-medium text-[hsl(var(--foreground))]">{formatDate(goal.targetDate)}</span>
                      {daysRemaining(goal.targetDate) !== null && daysRemaining(goal.targetDate)! > 0 && (
                        <span className="ml-1 text-[hsl(var(--muted-foreground))]">({daysRemaining(goal.targetDate)} days away)</span>
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* Target date for non-debt goals */}
              {!isDebtFree && goal.targetDate && (
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  Target: {formatDate(goal.targetDate)}
                  {days !== null && !goal.isCompleted && (
                    <span className={`ml-1 font-medium ${days < 0 ? 'text-red-500' : days < 30 ? 'text-yellow-500' : 'text-[hsl(var(--muted-foreground))]'}`}>
                      ({days < 0 ? `${Math.abs(days)}d overdue` : `${days}d remaining`})
                    </span>
                  )}
                </p>
              )}

              {goal.notes && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 italic">{goal.notes}</p>}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => onEdit(goal)} className="h-8 w-8 p-0">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(goal.id)} className="h-8 w-8 p-0 text-[hsl(var(--muted-foreground))] hover:text-red-600 dark:hover:text-red-400">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
