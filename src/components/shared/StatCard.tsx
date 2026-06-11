import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type StatAccent = 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'muted';

const accentStyles: Record<StatAccent, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  destructive: 'bg-destructive/10 text-destructive',
  info: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  muted: 'bg-muted text-muted-foreground',
};

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accent?: StatAccent;
  hint?: string;
  /** Versión densa en mobile (3 en una fila); desde sm vuelve al layout normal. */
  compact?: boolean;
  className?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  accent = 'primary',
  hint,
  compact = false,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent
        className={cn(
          'flex items-center gap-4 p-4 sm:p-5',
          compact && 'flex-col items-start gap-1.5 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-5'
        )}
      >
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            compact && 'h-8 w-8 rounded-lg sm:h-11 sm:w-11 sm:rounded-xl',
            accentStyles[accent]
          )}
        >
          <Icon className={cn('h-5 w-5', compact && 'h-4 w-4 sm:h-5 sm:w-5')} />
        </div>
        <div className={cn('min-w-0 flex-1', compact && 'w-full sm:w-auto')}>
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p
            className={cn(
              'mt-1 text-2xl font-semibold text-foreground sm:text-3xl',
              compact && 'mt-0.5 text-xl sm:mt-1 sm:text-3xl'
            )}
          >
            {value}
          </p>
          {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
