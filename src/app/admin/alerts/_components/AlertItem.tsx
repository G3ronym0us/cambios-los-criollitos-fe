'use client';

import { AlertTriangle, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import type { RateAlert } from '@/types/notifications';

interface AlertItemProps {
  alert: RateAlert;
  onAck: (uuid: string) => void;
}

type Severity = 'critical' | 'warning' | 'info';

function getSeverity(diffPercentage: number): Severity {
  const abs = Math.abs(diffPercentage);
  if (abs >= 3) return 'critical';
  if (abs >= 1) return 'warning';
  return 'info';
}

const severityStyles: Record<
  Severity,
  { text: string; bg: string; badgeTone: 'destructive' | 'warning' | 'info' }
> = {
  critical: {
    text: 'text-destructive',
    bg: 'bg-destructive/10',
    badgeTone: 'destructive',
  },
  warning: {
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    badgeTone: 'warning',
  },
  info: {
    text: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-500/10',
    badgeTone: 'info',
  },
};

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AlertItem({ alert, onAck }: AlertItemProps) {
  const severity = getSeverity(alert.diff_percentage);
  const styles = severityStyles[severity];
  const isAcked = !!alert.acknowledged_at;
  const sign = alert.diff_percentage > 0 ? '+' : '';

  return (
    <Card
      className={cn(
        'overflow-hidden transition-shadow hover:shadow-md',
        isAcked && 'opacity-60'
      )}
    >
      <CardContent className="space-y-3 p-4 sm:p-5">
        <header className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div
              aria-hidden
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                styles.bg
              )}
            >
              <AlertTriangle className={cn('h-5 w-5', styles.text)} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-semibold text-foreground">
                  {alert.from_currency}{' '}
                  <ArrowRight className="inline h-4 w-4 text-muted-foreground" />{' '}
                  {alert.to_currency}
                </h3>
                {isAcked ? (
                  <StatusBadge tone="success" icon={Check}>
                    Vista
                  </StatusBadge>
                ) : (
                  <StatusBadge tone={styles.badgeTone}>No vista</StatusBadge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{formatDate(alert.created_at)}</p>
            </div>
          </div>

          {!isAcked ? (
            <Button variant="outline" size="lg" onClick={() => onAck(alert.uuid)}>
              <Check className="h-4 w-4" />
              Marcar vista
            </Button>
          ) : null}
        </header>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Manual
            </p>
            <p className="mt-1 font-mono text-sm text-foreground">{alert.manual_rate}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Automática
            </p>
            <p className="mt-1 font-mono text-sm text-foreground">{alert.automatic_rate}</p>
          </div>
          <div className={cn('rounded-lg px-3 py-2', styles.bg)}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Diferencia
            </p>
            <p className={cn('mt-1 font-mono text-sm font-semibold', styles.text)}>
              {sign}
              {alert.diff_percentage.toFixed(3)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
