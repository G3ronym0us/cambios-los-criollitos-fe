'use client';

import Link from 'next/link';
import { ChevronRight, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { OverviewMe, OverviewOperations, OverviewPayments } from '@/types/overview';
import { formatDailyAverage, formatMoney } from '../_lib/overviewFormat';
import { BlockError } from './BlockError';

interface DayGridProps {
  payments: OverviewPayments | null | undefined;
  operations: OverviewOperations | null | undefined;
  me: OverviewMe | null | undefined;
  errors: string[];
  loading: boolean;
  onRetry: () => void;
}

/**
 * "El día" es lectura, no bandeja — no está en la tabla de destinos del diseño, así que
 * no enlaza a ningún sitio. "Mis ganancias de hoy" sí: es la única cifra personal y abre
 * el reporte ya filtrado a hoy.
 */
export function DayGrid({ payments, operations, me, errors, loading, onRetry }: DayGridProps) {
  if (loading && !payments && !operations && !me) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
    );
  }

  const meFailed = errors.includes('me');
  const openToday =
    payments != null ? Math.max(0, payments.received_today - payments.reconciled_today) : null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Card>
        <CardContent className="space-y-3 p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            El día
          </p>

          {payments ? (
            <div>
              <span className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tabular-nums text-foreground">
                  {payments.reconciled_today}
                </span>
                <span className="text-xs text-muted-foreground">
                  de {payments.received_today} conciliados
                </span>
              </span>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {openToday
                  ? `${openToday} comprobante${openToday === 1 ? '' : 's'} de hoy sigue${openToday === 1 ? '' : 'n'} abierto${openToday === 1 ? '' : 's'}`
                  : 'todos los comprobantes de hoy están conciliados'}
              </p>
            </div>
          ) : errors.includes('payments') ? (
            <p className="text-xs text-muted-foreground">—</p>
          ) : null}

          {operations ? (
            <div className="border-t border-border pt-3">
              <span className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tabular-nums text-foreground">
                  {operations.completed_today}
                </span>
                <span className="text-xs text-muted-foreground">completadas hoy</span>
              </span>
              <p className="mt-0.5 text-xs text-muted-foreground">
                promedio de la semana, {formatDailyAverage(operations.completed_daily_avg_week)} al día
              </p>
            </div>
          ) : errors.includes('operations') ? (
            <p className="border-t border-border pt-3 text-xs text-muted-foreground">—</p>
          ) : null}
        </CardContent>
      </Card>

      {meFailed ? (
        <BlockError module="tus ganancias de hoy" onRetry={onRetry} />
      ) : me ? (
        <Link
          href="/admin/reports/my-profits?desde=hoy"
          className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50 sm:p-5"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="h-4 w-4" />
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground sm:hidden" aria-hidden />
          </div>
          <div>
            <span className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {formatMoney(me.profit_today, null)}
              </span>
              <span className="text-xs font-medium text-muted-foreground">{me.profit_currency}</span>
            </span>
            <p className="mt-0.5 text-xs text-muted-foreground">
              mis ganancias de hoy · {me.transactions_today}{' '}
              {me.transactions_today === 1 ? 'transacción' : 'transacciones'}
            </p>
          </div>
        </Link>
      ) : null}
    </div>
  );
}
