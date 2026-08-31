'use client';

import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPending, pendingTone, waitedFor, type PendingTotals } from '../_lib/pending';
import type { ClientsSort } from '../_hooks/useClients';

interface ClientsPendingSummaryProps {
  clients: number;
  totals: PendingTotals;
  /** Se pidieron más operaciones sin cubrir de las que caben: el total se queda corto. */
  capped: boolean;
  sort: ClientsSort;
  onSort: (sort: ClientsSort) => void;
}

const SORTS: { value: ClientsSort; label: string }[] = [
  { value: 'age', label: 'Antigüedad' },
  { value: 'amount', label: 'Monto' },
  { value: 'name', label: 'A-Z' },
];

/**
 * La franja de arriba cuando se filtra por «con pendiente»: cuánto se debe en total, en
 * cuántas operaciones, y desde cuándo. Aquí es donde vive la antigüedad — fila a fila
 * ensuciaba el directorio sin decir nada que no diga el color del monto.
 */
export function ClientsPendingSummary({
  clients,
  totals,
  capped,
  sort,
  onSort,
}: ClientsPendingSummaryProps) {
  const waited = waitedFor(totals.oldest_at);
  const alert = pendingTone(totals.oldest_at) === 'destructive';

  return (
    <div className="flex flex-col gap-3 border-b border-border bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-bold tabular-nums text-foreground">
          {clients} {clients === 1 ? 'cliente' : 'clientes'}
          {totals.currency ? (
            <> · {formatPending(totals.amount, totals.currency)} por entregar</>
          ) : (
            <> con algo por entregar</>
          )}
          {totals.payout_amount != null && totals.payout_currency ? (
            <span className="font-medium text-muted-foreground">
              {' '}
              (≈ {formatPending(totals.payout_amount, totals.payout_currency)})
            </span>
          ) : null}
        </p>
        <p className="text-xs text-muted-foreground">
          {totals.operations} {totals.operations === 1 ? 'operación' : 'operaciones'} sin cubrir
          {waited ? (
            <>
              {' · '}
              <span className={cn(alert && 'font-semibold text-destructive')}>
                la más vieja lleva {waited} esperando
              </span>
            </>
          ) : null}
          {totals.currency ? null : ' · hay varias monedas, mira cada fila'}
        </p>
        {capped ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Hay más operaciones sin cubrir de las que se cargaron: el total se queda corto.
          </p>
        ) : null}
      </div>

      <div
        role="group"
        aria-label="Ordenar clientes"
        className="flex shrink-0 gap-0.5 rounded-lg border border-border bg-card p-0.5"
      >
        {SORTS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={sort === option.value}
            onClick={() => onSort(option.value)}
            className={cn(
              'min-h-9 rounded-md px-2.5 text-xs font-semibold transition-colors',
              sort === option.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
