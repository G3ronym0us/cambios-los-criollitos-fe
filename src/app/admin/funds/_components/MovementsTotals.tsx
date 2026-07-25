'use client';

import { ArrowDownLeft, ArrowUpRight, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { FundMovementTotals } from '@/types/fund';
import { formatUSDT } from '../_lib/format';

interface MovementsTotalsProps {
  totals: FundMovementTotals | null;
  loading: boolean;
  hasActiveFilters: boolean;
}

/**
 * Los dos acumulados del historial: cuánta ganancia dejaron estos movimientos y cómo quedó
 * el capital (lo que entró contra lo que salió). Cubren TODO lo filtrado, no la página que
 * se ve, así que al filtrar por fechas responden «cuánto se ganó en ese período».
 */
export function MovementsTotals({ totals, loading, hasActiveFilters }: MovementsTotalsProps) {
  if (loading && !totals) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i} className="h-28 animate-pulse bg-muted/40" />
        ))}
      </div>
    );
  }

  if (!totals) return null;

  const scope = hasActiveFilters ? 'de lo filtrado' : 'de todo el historial';
  const netIsPositive = totals.net_usdt >= 0;
  const hasOtherOutflow = totals.personal_usdt > 0 || totals.adjustments_usdt !== 0;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Ganancia acumulada
          </p>
        </div>
        <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
          {formatUSDT(totals.profit_usdt)} USDT
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {totals.profit_count} {totals.profit_count === 1 ? 'movimiento' : 'movimientos'} con
          operación · {scope}
        </p>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Entradas vs salidas
          </p>
        </div>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="inline-flex items-baseline gap-1.5">
            <ArrowDownLeft className="h-3.5 w-3.5 shrink-0 self-center text-sky-600 dark:text-sky-400" />
            <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
              {formatUSDT(totals.deposits_usdt)}
            </span>
            <span className="text-xs text-muted-foreground">
              depósitos ({totals.deposits_count})
            </span>
          </span>
          <span className="inline-flex items-baseline gap-1.5">
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 self-center text-amber-600 dark:text-amber-400" />
            <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
              {formatUSDT(totals.exchanges_usdt)}
            </span>
            <span className="text-xs text-muted-foreground">
              cambios ({totals.exchanges_count})
            </span>
          </span>
        </div>

        <p className="mt-1 text-xs text-muted-foreground">
          Neto{' '}
          <span
            className={cn(
              'font-mono font-semibold tabular-nums',
              netIsPositive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400',
            )}
          >
            {netIsPositive ? '+' : ''}
            {formatUSDT(totals.net_usdt)} USDT
          </span>
          {hasOtherOutflow ? (
            <>
              {' '}
              · incluye {formatUSDT(totals.personal_usdt)} personales
              {totals.adjustments_usdt !== 0
                ? ` y ${formatUSDT(totals.adjustments_usdt)} de ajustes`
                : ''}
            </>
          ) : null}{' '}
          · {scope}
        </p>
      </Card>
    </div>
  );
}
