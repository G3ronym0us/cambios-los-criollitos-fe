'use client';

import { AlertTriangle, Clock, Pencil, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PairsSummary } from '../_lib/pairFilters';
import { formatAge, formatPercentage } from '../_lib/pairHealth';

interface PairsStatsProps {
  summary: PairsSummary;
  /** Pulsar la cifra de alertas salta al segmento «Con alerta». */
  onShowAlerts: () => void;
}

interface PillProps {
  value: string;
  label: string;
  detail?: string;
  tone?: 'warning' | 'neutral';
  icon: React.ReactNode;
  onClick?: () => void;
}

function Pill({ value, label, detail, tone = 'neutral', icon, onClick }: PillProps) {
  const content = (
    <>
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          tone === 'warning'
            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
            : 'bg-muted text-muted-foreground'
        )}
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0 text-left">
        <span className="flex items-baseline gap-1.5">
          <span
            className={cn(
              'text-lg font-bold tabular-nums',
              tone === 'warning' ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'
            )}
          >
            {value}
          </span>
          <span
            className={cn(
              'text-xs',
              tone === 'warning' ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'
            )}
          >
            {label}
          </span>
        </span>
        {detail ? (
          <span className="block truncate text-xs text-muted-foreground">{detail}</span>
        ) : null}
      </span>
    </>
  );

  const className = cn(
    'flex min-h-11 flex-1 items-center gap-2.5 rounded-xl border px-3 py-2 text-left sm:min-w-[13rem] sm:flex-none',
    tone === 'warning' ? 'border-amber-500/30 bg-amber-500/10' : 'border-border bg-card'
  );

  if (!onClick) return <div className={className}>{content}</div>;

  return (
    <button type="button" onClick={onClick} className={cn(className, 'transition-colors hover:bg-muted/50')}>
      {content}
    </button>
  );
}

export function PairsStats({ summary, onShowAlerts }: PairsStatsProps) {
  const alertDetail =
    summary.alerts === 0
      ? 'todo al día'
      : [
          summary.stale ? `${summary.stale} tasa vieja` : null,
          summary.missing ? `${summary.missing} sin tasa` : null,
        ]
          .filter(Boolean)
          .join(' · ');

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Pill
        value={String(summary.alerts)}
        label="con alerta"
        detail={alertDetail}
        tone={summary.alerts > 0 ? 'warning' : 'neutral'}
        icon={<AlertTriangle className="h-4 w-4" />}
        onClick={summary.alerts > 0 ? onShowAlerts : undefined}
      />
      <Pill
        value={String(summary.manual)}
        label={summary.manual === 1 ? 'precio manual' : 'precios manuales'}
        detail={
          summary.largestManualDeviation != null
            ? `el mayor, ${formatPercentage(summary.largestManualDeviation)} sobre el auto`
            : undefined
        }
        icon={<Pencil className="h-4 w-4" />}
      />
      <Pill
        value={`${summary.active} de ${summary.total}`}
        label="activos"
        detail={`${summary.monitored} monitoreados · ${summary.binance} en Binance`}
        icon={<ToggleRight className="h-4 w-4" />}
      />
      <Pill
        value={summary.lastReadAt ? formatAge(summary.lastReadAt).replace('hace ', '') : '—'}
        label="desde la última lectura"
        detail={summary.lastReadAt ? 'tasa más reciente del sistema' : 'ningún par tiene tasa'}
        icon={<Clock className="h-4 w-4" />}
      />
    </div>
  );
}
