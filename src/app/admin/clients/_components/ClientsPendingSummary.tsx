'use client';

import { cn } from '@/lib/utils';
import { formatPending, pendingTone, waitedFor, type PendingTotals } from '../_lib/pending';
import type { ClientsSort } from '../_hooks/useClients';

interface ClientsPendingSummaryProps {
  /** Cuántos de los clientes a la vista deben algo. Cero = no hay deuda que resumir. */
  clients: number;
  /** Cuántos clientes se están enseñando en total, con deuda o sin ella. */
  shown: number;
  totals: PendingTotals;
  sort: ClientsSort;
  onSort: (sort: ClientsSort) => void;
}

const SORTS: { value: ClientsSort; label: string }[] = [
  { value: 'age', label: 'Antigüedad' },
  { value: 'amount', label: 'Monto' },
  { value: 'name', label: 'A-Z' },
];

/**
 * La tira entre los filtros y las filas: qué hay a la vista y en qué orden.
 *
 * Se pinta SIEMPRE, aunque nadie deba nada. Antes sólo aparecía cuando había deuda, y con
 * ella se iban los botones de orden: el día que no hubiera pendientes no se podía ni
 * ordenar el directorio por A-Z. Lo condicional es el resumen de deuda, no la tira.
 *
 * Con deuda enseña cuánto se debe, en cuántas operaciones y desde cuándo. Aquí es donde
 * vive la antigüedad — fila a fila ensuciaba el directorio sin decir nada que no diga ya
 * el color del monto.
 */
export function ClientsPendingSummary({
  clients,
  shown,
  totals,
  sort,
  onSort,
}: ClientsPendingSummaryProps) {
  const waited = waitedFor(totals.oldest_at);
  const alert = pendingTone(totals.oldest_at) === 'destructive';
  const hasDebt = clients > 0;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5',
        hasDebt ? 'bg-amber-500/10' : 'bg-muted/40',
      )}
    >
      {hasDebt ? (
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-bold tabular-nums text-foreground">
            {clients} {clients === 1 ? 'cliente' : 'clientes'}
            {totals.currency ? (
              <> · {formatPending(totals.amount, totals.currency)} por entregar</>
            ) : (
              <> con algo por entregar</>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {totals.operations} {totals.operations === 1 ? 'operación' : 'operaciones'} sin
            cubrir
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
        </div>
      ) : (
        <p className="min-w-0 text-sm text-muted-foreground">
          {shown} {shown === 1 ? 'cliente' : 'clientes'} a la vista · no le debemos nada a nadie
        </p>
      )}

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
