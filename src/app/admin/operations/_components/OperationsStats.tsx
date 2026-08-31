'use client';

import { AlertTriangle, Clock, Truck, UserX } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OperationStats } from '@/types/operation';
import type { NeedsFilter } from '../_hooks/useOperations';
import { timeSince, timeUntil } from '../_lib/operationCoverage';

interface OperationsStatsProps {
  stats: OperationStats;
  active: NeedsFilter;
  /** Pulsar una tarjeta aplica su bandeja; volver a pulsarla la quita. */
  onPick: (needs: NeedsFilter) => void;
}

interface CardProps {
  value: string;
  label: string;
  detail: string;
  icon: LucideIcon;
  tone: 'warning' | 'neutral';
  active: boolean;
  onClick: () => void;
}

function Card({ value, label, detail, icon: Icon, tone, active, onClick }: CardProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex min-h-11 flex-1 items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors',
        active
          ? 'border-primary bg-primary/5 ring-3 ring-primary/10'
          : tone === 'warning'
            ? 'border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15'
            : 'border-border bg-card hover:bg-muted/50',
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          tone === 'warning'
            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
            : 'bg-muted text-muted-foreground',
        )}
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="flex items-baseline gap-1.5">
          <span
            className={cn(
              'text-lg font-bold tabular-nums',
              tone === 'warning' ? 'text-amber-700 dark:text-amber-400' : 'text-foreground',
            )}
          >
            {value}
          </span>
          <span
            className={cn(
              'text-xs',
              tone === 'warning' ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground',
            )}
          >
            {label}
          </span>
        </span>
        <span className="block truncate text-xs text-muted-foreground">{detail}</span>
      </span>
    </button>
  );
}

/**
 * Las cuatro cifras que sí cambian lo que haces al abrir la pantalla.
 *
 * El censo por estado —cotizadas / pendientes / completadas / canceladas— decía cuántas
 * hay de cada color, no cuál tocar. Estas cuentan TODO (vienen de `getStats`, no de la
 * página) y cada una es un filtro.
 */
export function OperationsStats({ stats, active, onPick }: OperationsStatsProps) {
  const pick = (needs: NeedsFilter) => () => onPick(active === needs ? null : needs);
  const money = stats.to_settle_amount.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Card
        value={String(stats.to_settle)}
        label="por cuadrar"
        detail={stats.to_settle ? `faltan ${money} en comprobantes` : 'todo cuadrado'}
        icon={AlertTriangle}
        tone={stats.to_settle > 0 ? 'warning' : 'neutral'}
        active={active === 'settle'}
        onClick={pick('settle')}
      />
      <Card
        value={String(stats.to_deliver)}
        label="por entregar"
        detail={
          stats.to_deliver
            ? `efectivo · la más vieja, ${timeSince(stats.to_deliver_oldest_at) ?? '—'}`
            : 'sin entregas pendientes'
        }
        icon={Truck}
        tone={stats.to_deliver > 0 ? 'warning' : 'neutral'}
        active={active === 'deliver'}
        onClick={pick('deliver')}
      />
      <Card
        value={String(stats.without_client)}
        label="sin cliente asignado"
        detail={
          stats.without_client ? 'vienen de grupo · se resuelve al vincular' : 'todas identificadas'
        }
        icon={UserX}
        tone="neutral"
        active={active === 'client'}
        onClick={pick('client')}
      />
      <Card
        value={String(stats.expiring)}
        label="cotizaciones por vencer"
        detail={
          stats.expiring
            ? `la más próxima, ${timeUntil(stats.expiring_next_at) ?? '—'}`
            : 'ninguna por vencer'
        }
        icon={Clock}
        tone="neutral"
        active={active === 'expiring'}
        onClick={pick('expiring')}
      />
    </div>
  );
}
