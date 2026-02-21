import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LayoutDashboard, Wallet, ArrowLeftRight, CreditCard, TrendingUp, Target, LogOut, Menu, X, DollarSign, FileBarChart, Upload, BookOpen, Settings, Moon, Sun, Flag } from 'lucide-react';
import { Button } from './ui/button';
import { useState } from 'react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/accounts', label: 'Accounts', icon: Wallet },
  { path: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { path: '/debts', label: 'Debts', icon: CreditCard },
  { path: '/investments', label: 'Investments', icon: TrendingUp },
  { path: '/budgets', label: 'Budgets', icon: Target },
  { path: '/goals', label: 'Goals', icon: Flag },
  { path: '/reports', label: 'Reports', icon: FileBarChart },
  { path: '/import', label: 'Import', icon: Upload },
  { path: '/docs', label: 'Docs', icon: BookOpen },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <div className="lg:hidden flex items-center justify-between p-4 border-b print:hidden">
        <div className="flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-[hsl(var(--primary))]" />
          <span className="font-bold text-lg">FinanceCmd</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      <div className="flex">
        <aside className={`${sidebarOpen ? 'block' : 'hidden'} lg:block w-64 min-h-screen border-r bg-[hsl(var(--card))] fixed lg:sticky top-0 z-40 print:hidden`}>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-8">
              <DollarSign className="h-8 w-8 text-[hsl(var(--primary))]" />
              <div>
                <h1 className="font-bold text-xl">FinanceCmd</h1>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Command Center</p>
              </div>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${isActive ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]'}`}>
                    <Icon className="h-4 w-4" />{item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{user?.email}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </aside>
        <main className="flex-1 p-6 lg:p-8 min-h-screen print:p-4">{children}</main>
      </div>
    </div>
  );
}
