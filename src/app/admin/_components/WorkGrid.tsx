'use client';

import { AlertTriangle, CheckCircle2, Clock, Scale, Truck } from 'lucide-react';
import type { OverviewOperations, OverviewPayments } from '@/types/overview';
import { OverviewLinkCard, OverviewLinkCardSkeleton } from './OverviewLinkCard';
import { BlockError } from './BlockError';
import { bareDuration, formatMoney, formatUnassigned, isFullyReconciled, timeUntil } from '../_lib/overviewFormat';

interface WorkGridProps {
  payments: OverviewPayments | null | undefined;
  operations: OverviewOperations | null | undefined;
  errors: string[];
  loading: boolean;
  onRetry: () => void;
}

/**
 * Las cuatro cifras que sí cambian lo que haces al abrir la home: por atender, por
 * cuadrar, por entregar, por vencer. Un clic, una bandeja ya filtrada.
 *
 * "Por atender" viene de `payments`; las otras tres de `operations` — cada bloque puede
 * fallar aparte (llega en `null`, con su nombre en `errors`), así que un fallo en uno no
 * tumba las tarjetas del otro.
 */
export function WorkGrid({ payments, operations, errors, loading, onRetry }: WorkGridProps) {
  if (loading && !payments && !operations) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <OverviewLinkCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const paymentsFailed = errors.includes('payments');
  const operationsFailed = errors.includes('operations');

  const reconciled =
    payments && operations
      ? isFullyReconciled({
          needsAttention: payments.needs_attention,
          toSettle: operations.to_settle,
          toDeliver: operations.to_deliver,
          expiring: operations.expiring,
        })
      : false;

  if (reconciled && payments && operations) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 sm:flex-row sm:items-center">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <div>
          <p className="text-base font-semibold text-foreground">Todo conciliado</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {payments.received_today > 0
              ? `Los ${payments.received_today} comprobantes de hoy tienen su operación y no queda nada por cuadrar ni por entregar. `
              : 'No queda nada por cuadrar ni por entregar. '}
            Las cifras del día siguen abajo.
          </p>
        </div>
      </div>
    );
  }

  const attendCard = paymentsFailed ? (
    <BlockError module="los pagos" onRetry={onRetry} className="sm:col-span-2 lg:col-span-1" />
  ) : payments ? (
    <OverviewLinkCard
      href="/admin/payments?att=ATTENTION&tab=incoming"
      icon={AlertTriangle}
      value={String(payments.needs_attention)}
      label="por atender"
      tone={payments.needs_attention > 0 ? 'warning' : 'success'}
      detailLines={[
        [
          payments.unlinked ? `${payments.unlinked} sin vincular` : null,
          payments.to_review ? `${payments.to_review} por revisar` : null,
          payments.partially_split ? `${payments.partially_split} repartido a medias` : null,
        ]
          .filter(Boolean)
          .join(' · ') || null,
        payments.unassigned_amount > 0
          ? formatUnassigned(
              payments.unassigned_amount,
              payments.unassigned_currency,
              payments.unassigned_truncated
            )
          : null,
      ]}
      footerCaption="Pagos · por atender"
    />
  ) : null;

  if (operationsFailed) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {attendCard}
        <BlockError module="las operaciones" onRetry={onRetry} className="sm:col-span-2 lg:col-span-3" />
      </div>
    );
  }

  if (!operations) return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{attendCard}</div>;

  const settleTotal = operations.to_settle_covered + operations.to_settle_amount;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {attendCard}

      <OverviewLinkCard
        href="/admin/operations?needs=settle"
        icon={Scale}
        value={String(operations.to_settle)}
        label="por cuadrar"
        tone={operations.to_settle > 0 ? 'warning' : 'success'}
        detailLines={[
          operations.to_settle > 0
            ? `${formatMoney(operations.to_settle_covered, null)} cubiertos de ${formatMoney(settleTotal, null)}`
            : null,
          operations.to_settle > 0 ? `Faltan ${formatMoney(operations.to_settle_amount, null)} en comprobantes` : null,
        ]}
        footerCaption="Operaciones · por cuadrar"
      />

      <OverviewLinkCard
        href="/admin/operations?needs=deliver"
        icon={Truck}
        value={String(operations.to_deliver)}
        label="por entregar"
        tone={operations.to_deliver > 0 ? 'warning' : 'success'}
        detailLines={[
          operations.to_deliver > 0
            ? `Efectivo · la más vieja lleva ${bareDuration(operations.to_deliver_oldest_at) ?? '—'}`
            : 'sin entregas pendientes',
        ]}
        footerCaption="Operaciones · por entregar"
      />

      <OverviewLinkCard
        href="/admin/operations?needs=expiring"
        icon={Clock}
        value={String(operations.expiring)}
        label="por vencer"
        tone={operations.expiring > 0 ? 'warning' : 'success'}
        detailLines={[
          operations.expiring > 0
            ? `La más próxima, ${timeUntil(operations.expiring_next_at) ?? '—'}`
            : 'Ninguna cotización se cae en las próximas horas',
        ]}
        footerCaption="Operaciones · por vencer"
      />
    </div>
  );
}
