'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Bell, Check, RefreshCw } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useNotifications } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';
import type { RateAlert } from '@/types/notifications';

function formatRelative(dateString: string): string {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'hace un momento';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `hace ${diffHr} h`;
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSeverityTextClass(diffPercentage: number): string {
  const abs = Math.abs(diffPercentage);
  if (abs >= 3) return 'text-destructive';
  if (abs >= 1) return 'text-amber-600 dark:text-amber-400';
  return 'text-muted-foreground';
}

interface AlertRowProps {
  alert: RateAlert;
  onAcknowledge: (uuid: string) => void;
}

function AlertRow({ alert, onAcknowledge }: AlertRowProps) {
  const isAcked = !!alert.acknowledged_at;
  const severity = getSeverityTextClass(alert.diff_percentage);
  const sign = alert.diff_percentage > 0 ? '+' : '';

  return (
    <div
      className={cn(
        'border-b border-border px-3 py-2 last:border-b-0',
        isAcked && 'opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <AlertTriangle className={cn('h-3.5 w-3.5 shrink-0', severity)} />
            <span className="text-sm font-medium text-foreground">
              {alert.from_currency}
              <ArrowRight className="mx-1 inline h-3 w-3 text-muted-foreground" />
              {alert.to_currency}
            </span>
            <span className={cn('text-sm font-semibold', severity)}>
              {sign}
              {alert.diff_percentage.toFixed(2)}%
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Manual: <span className="font-mono text-foreground/80">{alert.manual_rate}</span>
            <span className="mx-1">·</span>
            Auto: <span className="font-mono text-foreground/80">{alert.automatic_rate}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {formatRelative(alert.created_at)}
          </p>
        </div>
        {!isAcked ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onAcknowledge(alert.uuid)}
            className="shrink-0 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-400"
            aria-label="Marcar como vista"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default function NotificationBell() {
  const { alerts, unreadCount, isConnected, loading, acknowledge, refresh } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const visibleAlerts = alerts.slice(0, 10);
  const badgeText = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={
          unreadCount > 0 ? `Notificaciones (${unreadCount} sin leer)` : 'Notificaciones'
        }
        className="relative min-h-11 min-w-11"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {badgeText}
          </span>
        ) : null}
        <span
          className={cn(
            'absolute bottom-1.5 right-1.5 h-2 w-2 rounded-full ring-2 ring-background',
            isConnected ? 'bg-emerald-500' : 'bg-muted-foreground'
          )}
          aria-label={isConnected ? 'Conectado' : 'Desconectado'}
          title={isConnected ? 'Conectado' : 'Desconectado'}
        />
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-label="Alertas de divergencia"
          className="absolute right-0 z-50 mt-2 w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <h3 className="text-sm font-semibold text-foreground">Alertas de divergencia</h3>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => refresh()}
              disabled={loading}
              aria-label="Refrescar"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            </Button>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {visibleAlerts.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                {loading ? 'Cargando...' : 'No hay alertas'}
              </div>
            ) : (
              visibleAlerts.map((a) => (
                <AlertRow key={a.uuid} alert={a} onAcknowledge={acknowledge} />
              ))
            )}
          </div>

          <div className="border-t border-border p-2">
            <Link
              href="/admin/alerts"
              onClick={() => setOpen(false)}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'w-full justify-center font-medium'
              )}
            >
              Ver todas las alertas
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
