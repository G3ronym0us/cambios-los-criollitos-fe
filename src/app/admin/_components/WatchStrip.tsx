'use client';

import Link from 'next/link';
import { ChevronRight, Contact, Gauge } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { OverviewAlerts, OverviewClients } from '@/types/overview';
import { BlockError } from './BlockError';
import { formatDeviation, formatMoney, staleLabel, topShareOfTotal, waitingDaysLabel } from '../_lib/overviewFormat';

interface WatchStripProps {
  alerts: OverviewAlerts | null | undefined;
  clients: OverviewClients | null | undefined;
  errors: string[];
  loading: boolean;
  onRetry: () => void;
}

/**
 * La vigilancia: divergencias de tasa sin ver y clientes con pendiente por entregar. Solo
 * ROOT la ve — son las decisiones que solo él toma — y el servidor ya se lo garantiza: si
 * este componente recibe `alerts`/`clients` es porque el rol vino con ellos.
 */
export function WatchStrip({ alerts, clients, errors, loading, onRetry }: WatchStripProps) {
  if (loading && !alerts && !clients) {
    return (
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Vigilancia · solo ROOT
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  const alertsFailed = errors.includes('alerts');
  const clientsFailed = errors.includes('clients');

  const totalPending = clients ? clients.totals.reduce((acc, t) => acc + t.amount, 0) : 0;
  const topAmounts = clients ? clients.oldest.map((o) => o.amount) : [];
  const topShare = clients ? topShareOfTotal(topAmounts, totalPending) : null;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Vigilancia · solo ROOT
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {alertsFailed ? (
          <BlockError module="las divergencias" onRetry={onRetry} />
        ) : alerts ? (
          <Link
            href="/admin/alerts?unacked=1"
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50 sm:p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400">
                <Gauge className="h-4 w-4" />
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground sm:hidden" aria-hidden />
            </div>

            <div>
              <span className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tabular-nums text-foreground">
                  {alerts.unseen}
                </span>
                <span className="text-xs font-medium text-muted-foreground">divergencias sin ver</span>
              </span>

              {alerts.top.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {alerts.top.map((a, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-foreground">{a.pair_symbol}</span>
                      <span className="text-muted-foreground">
                        {staleLabel(a.stale_hours) ?? formatDeviation(a.deviation_pct)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">sin divergencias que mostrar</p>
              )}
            </div>

            <p className="hidden text-xs font-medium text-primary sm:block">Alertas →</p>
          </Link>
        ) : null}

        {clientsFailed ? (
          <BlockError module="los pendientes de clientes" onRetry={onRetry} />
        ) : clients ? (
          <Link
            href="/admin/clients?pending=1"
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50 sm:p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400">
                <Contact className="h-4 w-4" />
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground sm:hidden" aria-hidden />
            </div>

            <div>
              <span className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tabular-nums text-foreground">
                  {clients.pending_count}
                </span>
                <span className="text-xs font-medium text-muted-foreground">clientes con pendiente</span>
              </span>

              {clients.oldest.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {clients.oldest.map((o, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-medium text-foreground">
                        {o.name} <span className="font-normal text-muted-foreground">· {waitingDaysLabel(o.waiting_days)}</span>
                      </span>
                      <span className="shrink-0 text-muted-foreground">{formatMoney(o.amount, o.currency)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {clients.totals.length > 0 ? (
                <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
                  Total por entregar
                  {topShare != null ? ` · los ${clients.oldest.length} mayores son el ${topShare} %` : ''}
                  <br />
                  <span className="font-semibold text-foreground">
                    {clients.totals.map((t) => formatMoney(t.amount, t.currency)).join(' + ')}
                  </span>
                </p>
              ) : null}
            </div>

            <p className="hidden text-xs font-medium text-primary sm:block">Clientes →</p>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
