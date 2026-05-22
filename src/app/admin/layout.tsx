'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Coins,
  ArrowLeftRight,
  DollarSign,
  TrendingUp,
  FileText,
  UserCheck,
  Users,
  Wallet,
  Menu,
  X,
  LogOut,
  Home,
  Bell,
} from 'lucide-react';
import { Role } from '@/utils/enums';
import NotificationBell from '@/components/admin/NotificationBell';
import { ConfirmProvider } from '@/hooks/useConfirm';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { LoadingState } from '@/components/shared/LoadingState';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Monedas', href: '/admin/currencies', icon: Coins },
  { name: 'Pares de Monedas', href: '/admin/currency-pairs', icon: ArrowLeftRight },
  { name: 'Transacciones', href: '/admin/transactions', icon: DollarSign },
  { name: 'Mis Ganancias', href: '/admin/reports/my-profits', icon: TrendingUp },
  { name: 'Resumen General', href: '/admin/reports/summary', icon: FileText },
  { name: 'Reporte por Usuario', href: '/admin/reports/users', icon: Users },
  { name: 'Usuarios', href: '/admin/users', icon: UserCheck },
  { name: 'Fondos', href: '/admin/funds', icon: Wallet },
  { name: 'Alertas', href: '/admin/alerts', icon: Bell },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, initializing, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!initializing && !loading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }

      if (user.role !== Role.ROOT && user.role !== Role.MODERATOR) {
        router.push('/');
        return;
      }
    }
  }, [user, loading, initializing, router]);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  if (initializing || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingState label="Cargando..." />
      </div>
    );
  }

  if (!user || (user.role !== Role.ROOT && user.role !== Role.MODERATOR)) {
    return null;
  }

  return (
    <ConfirmProvider>
      <div className="min-h-screen bg-background text-foreground">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Cerrar menú"
            className="fixed inset-0 z-20 bg-foreground/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-30 w-72 transform border-r border-border bg-card text-card-foreground transition-transform duration-300 ease-in-out lg:w-64 lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <h2 className="text-lg font-bold tracking-tight">Admin Panel</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="space-y-2 border-t border-border p-4">
              <div className="mb-2 flex items-center gap-3 px-1">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <span className="text-sm font-semibold">
                    {user.full_name?.charAt(0).toUpperCase() || user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {user.full_name || user.username}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{user.role}</p>
                </div>
              </div>

              <Link
                href="/"
                className={cn(buttonVariants({ variant: 'ghost', size: 'lg' }), 'w-full justify-start')}
              >
                <Home className="h-4 w-4" />
                Ir al Inicio
              </Link>

              <Button
                variant="destructive"
                size="lg"
                className="w-full justify-start"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </aside>

        <div className="lg:pl-64">
          <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center gap-2 px-4 sm:px-6 lg:px-8">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5" />
              </Button>

              <div className="hidden text-sm text-muted-foreground lg:block">
                Panel de Administración
              </div>

              <div className="ml-auto flex items-center gap-2">
                <ThemeToggle />
                <NotificationBell />
              </div>
            </div>
          </header>

          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </ConfirmProvider>
  );
}
