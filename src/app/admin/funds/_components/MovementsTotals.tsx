'use client';

import { ArrowLeftRight, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { FundMovementTotals } from '@/types/fund';
import { formatUSDT } from '../_lib/format';

interface MovementsTotalsProps {
  totals: FundMovementTotals | null;
  loading: boolean;
  hasActiveFilters: boolean;
}

/** Etiqueta de sección: versalita menuda con su chip de icono, como en el diseño. */
function CardLabel({
  icon: Icon,
  accent,
  children,
}: {
  icon: typeof TrendingUp;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-[7px]">
      <span
        className={cn('flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md', accent)}
      >
        <Icon className="h-3 w-3" />
      </span>
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {children}
      </span>
    </div>
  );
}

/**
 * Los dos acumulados del historial: cuánta ganancia dejaron estos movimientos y cómo quedó
 * el capital (lo que entró contra lo que salió). Cubren TODO lo filtrado, no la página que
 * se ve, así que al filtrar por fechas responden «cuánto se ganó en ese período».
 */
export function MovementsTotals({ totals, loading, hasActiveFilters }: MovementsTotalsProps) {
  if (loading && !totals) {
    return (
      <div className="grid gap-3.5 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i} className="h-[124px] animate-pulse bg-muted/40" />
        ))}
      </div>
    );
  }

  if (!totals) return null;

  const scope = hasActiveFilters ? 'de lo filtrado' : 'de todo el historial';
  const netIsPositive = totals.net_usdt >= 0;
  const hasOtherOutflow = totals.personal_usdt !== 0 || totals.adjustments_usdt !== 0;

  return (
    <div className="grid gap-3.5 sm:grid-cols-2">
      <Card className="gap-2 px-[18px] py-4">
        <CardLabel
          icon={TrendingUp}
          accent="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        >
          Ganancia acumulada
        </CardLabel>
        <p className="font-mono text-[26px] font-bold leading-none tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
          {formatUSDT(totals.profit_usdt)}
          <span className="ml-1.5 text-sm font-semibold text-muted-foreground">USDT</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {totals.profit_count} {totals.profit_count === 1 ? 'movimiento' : 'movimientos'} con
          operación · {scope}
        </p>
      </Card>

      <Card className="gap-2.5 px-[18px] py-4">
        <CardLabel icon={ArrowLeftRight} accent="bg-primary/10 text-primary">
          Entradas vs. salidas
        </CardLabel>

        <div className="flex items-end gap-5">
          <div className="min-w-0">
            <p className="whitespace-nowrap font-mono text-[19px] font-bold leading-none tabular-nums text-primary">
              {formatUSDT(totals.deposits_usdt)}
              <span className="ml-1 text-xs font-semibold text-muted-foreground">USDT</span>
            </p>
            <p className="mt-1 text-[11.5px] text-muted-foreground">
              Depósitos ({totals.deposits_count})
            </p>
          </div>

          <div className="w-px self-stretch bg-border" />

          <div className="min-w-0">
            <p className="whitespace-nowrap font-mono text-[19px] font-bold leading-none tabular-nums text-foreground">
              {formatUSDT(totals.exchanges_usdt)}
              <span className="ml-1 text-xs font-semibold text-muted-foreground">USDT</span>
            </p>
            <p className="mt-1 text-[11.5px] text-muted-foreground">
              Cambios ({totals.exchanges_count})
            </p>
          </div>
        </div>

        <p className="border-t border-border pt-2 text-[11.5px] text-muted-foreground">
          Neto{' '}
          <span
            className={cn(
              'font-mono font-semibold tabular-nums',
              netIsPositive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-destructive dark:text-red-400',
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
