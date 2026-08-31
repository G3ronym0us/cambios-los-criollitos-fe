'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, HandCoins, PartyPopper, RotateCcw } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { SidePanel, SidePanelHeader } from '@/components/shared/SidePanel';
import { cn } from '@/lib/utils';
import { formatCaracasShortDateTime } from '@/utils/functions';
import type { OperationData } from '@/types/operation';
import { OperationCoveragePanel } from '../../../operations/_components/OperationCoveragePanel';
import {
  formatPending,
  formatPendingBreakdown,
  payoutEquivalent,
  pendingSince,
  pendingTone,
  valueCurrency,
  waitedFor,
} from '../../_lib/pending';
import { blockedReason, useClientPending } from '../_hooks/useClientPending';
import { DistributeAmountPanel } from './DistributeAmountPanel';

interface ClientPendingTabProps {
  operations: OperationData[];
  loading: boolean;
  /** Saldo a favor del cliente, para la nota que separa una cosa de la otra. */
  hasOpenLoan: boolean;
  onChanged: () => void;
}

function Checkbox({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-md disabled:cursor-not-allowed',
        !disabled && 'hover:bg-muted',
      )}
    >
      <span
        className={cn(
          'flex h-[18px] w-[18px] items-center justify-center rounded border-2 transition-colors',
          disabled
            ? 'border-border bg-muted'
            : checked
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground/40 bg-card',
        )}
      >
        {checked ? <Check className="h-3 w-3" strokeWidth={3.5} /> : null}
      </span>
    </button>
  );
}

/**
 * Una operación sin cubrir, como fila.
 *
 * Es una sola fila responsiva: en móvil las cifras caen bajo el nombre y en ≥lg se alinean
 * en columnas. Nada de duplicar la fila para cada breakpoint.
 */
function PendingRow({
  operation,
  since,
  checked,
  undoable,
  working,
  onToggle,
  onCover,
  onUndo,
}: {
  operation: OperationData;
  /** Desde cuándo espera: la fecha del comprobante, no la de la operación. */
  since: string | null;
  checked: boolean;
  undoable: boolean;
  working: boolean;
  onToggle: () => void;
  onCover: () => void;
  onUndo: () => void;
}) {
  const blocked = blockedReason(operation);
  const currency = valueCurrency(operation);
  const pending = operation.pending_amount ?? 0;
  const delivered = operation.delivered_amount ?? 0;
  const payout = payoutEquivalent(operation);
  const waited = waitedFor(since);
  const alert = pendingTone(since) === 'destructive';

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-2 py-2 last:border-b-0 sm:px-3">
      <Checkbox
        checked={checked}
        disabled={!!blocked}
        label={`Seleccionar operación ${operation.uuid.slice(0, 8)}`}
        onChange={onToggle}
      />

      <div className="min-w-0 flex-1 basis-56">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Link
            href={`/admin/operations/${operation.uuid}`}
            className="font-mono text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            {operation.uuid.slice(0, 8)}
          </Link>
          {waited ? (
            <span
              className={cn(
                'text-xs font-semibold',
                alert ? 'text-destructive' : 'text-amber-700 dark:text-amber-400',
              )}
            >
              {waited}
            </span>
          ) : null}
        </div>
        <p className="truncate text-sm text-foreground">
          {operation.beneficiary_alias || (
            <span className="text-muted-foreground">Sin beneficiario</span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {formatCaracasShortDateTime(since)}
          {blocked ? <> · {blocked}</> : null}
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-baseline gap-4 text-right tabular-nums">
        {delivered > 0 ? (
          <span className="text-xs text-emerald-700 dark:text-emerald-400">
            <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
              Entregado
            </span>
            {formatPending(delivered, null)}
          </span>
        ) : null}
        <span>
          <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
            Falta
          </span>
          <span
            className={cn(
              'text-sm font-bold',
              alert ? 'text-destructive' : 'text-amber-700 dark:text-amber-400',
            )}
          >
            {formatPending(pending, currency)}
          </span>
          {payout != null && operation.to_currency ? (
            <span className="block text-[11px] font-normal text-muted-foreground">
              ≈ {formatPending(payout, operation.to_currency)}
            </span>
          ) : null}
        </span>
      </div>

      <div className="flex shrink-0 gap-2">
        {undoable ? (
          <Button variant="outline" size="sm" onClick={onUndo} disabled={working}>
            <RotateCcw className="h-3.5 w-3.5" />
            Deshacer
          </Button>
        ) : blocked ? (
          <Link
            href={`/admin/operations/${operation.uuid}`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            Completar datos
          </Link>
        ) : (
          <Button variant={delivered > 0 ? 'outline' : 'default'} size="sm" onClick={onCover}>
            {delivered > 0 ? 'Completar' : 'Cubrir'}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * La pestaña «Por entregar»: lo que le debemos al cliente, operación por operación, con
 * las dos maneras de saldarlo.
 *
 * «Cubrir» abre el panel de cobertura de siempre —el que ata comprobantes de verdad—; las
 * casillas y el reparto son el otro camino, el de la entrega en efectivo sin comprobante.
 */
export function ClientPendingTab({
  operations,
  loading,
  hasOpenLoan,
  onChanged,
}: ClientPendingTabProps) {
  const { state, actions } = useClientPending(operations, onChanged);
  const [covering, setCovering] = useState<string | null>(null);

  if (loading) return <LoadingState label="Cargando lo que le debemos..." />;

  if (state.rows.length === 0) {
    return (
      <EmptyState
        icon={PartyPopper}
        title="No le debemos nada"
        description="Todas sus operaciones están cubiertas."
      />
    );
  }

  const waited = waitedFor(state.totals.oldest_at);
  const undoableIds = new Set(state.undoable.map((item) => item.operationUuid));

  return (
    <div className="space-y-4">
      <Card className="border-amber-500/30 bg-amber-500/10">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Le debemos
            </p>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {formatPendingBreakdown(state.entries)}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {state.totals.currency != null &&
              state.totals.payout_amount != null &&
              state.totals.payout_currency ? (
                <>≈ {formatPending(state.totals.payout_amount, state.totals.payout_currency)} · </>
              ) : null}
              {state.totals.operations}{' '}
              {state.totals.operations === 1 ? 'operación' : 'operaciones'}
              {waited ? <> · desde hace {waited}</> : null}
            </p>
          </div>
          <Button
            variant={state.mode === 'distribute' ? 'default' : 'outline'}
            onClick={() => actions.setMode(state.mode === 'distribute' ? 'select' : 'distribute')}
          >
            <HandCoins className="h-4 w-4" />
            {state.mode === 'distribute' ? 'Volver a la lista' : 'Repartir un monto'}
          </Button>
        </CardContent>
      </Card>

      {state.pairs.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={state.pair === ''}
            onClick={() => actions.setPair('')}
            className={cn(
              'min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors',
              state.pair === ''
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:bg-muted',
            )}
          >
            Todos los pares
          </button>
          {state.pairs.map((pair) => (
            <button
              key={pair}
              type="button"
              aria-pressed={state.pair === pair}
              onClick={() => actions.setPair(pair)}
              className={cn(
                'min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors',
                state.pair === pair
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted',
              )}
            >
              {pair}
            </button>
          ))}
        </div>
      ) : null}

      {state.mode === 'distribute' ? (
        <DistributeAmountPanel state={state} actions={actions} />
      ) : (
        <Card className="overflow-hidden py-0">
          <CardContent className="p-0">
            {state.rows.map((operation) => (
              <PendingRow
                key={operation.uuid}
                operation={operation}
                since={pendingSince(operation, state.paymentDates)}
                checked={state.selected.has(operation.uuid)}
                undoable={undoableIds.has(operation.uuid)}
                working={state.working}
                onToggle={() => actions.toggle(operation.uuid)}
                onCover={() => setCovering(operation.uuid)}
                onUndo={() => actions.undoOne(operation.uuid)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Barra de selección: sólo aparece cuando hay algo seleccionado, y se queda pegada
          abajo para no perderla al hacer scroll por una lista larga. */}
      {state.mode === 'select' && state.selectedRows.length > 0 ? (
        <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-xl bg-foreground p-3 text-background shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-bold tabular-nums">
              {state.selectedRows.length} seleccionada
              {state.selectedRows.length === 1 ? '' : 's'} ·{' '}
              {formatPendingBreakdown(state.selectedEntries)}
            </p>
            <p className="text-xs opacity-70 tabular-nums">
              Quedarían {state.rows.length - state.selectedRows.length} ops ·{' '}
              {formatPendingBreakdown(state.remainingEntries)} por entregar
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={actions.clearSelection}>
              Quitar selección
            </Button>
            {state.selectedRows.length < state.selectable.length ? (
              <Button variant="ghost" size="sm" onClick={actions.selectAll}>
                Seleccionar todas ({state.selectable.length})
              </Button>
            ) : null}
            <Button size="sm" onClick={actions.markSelected} disabled={state.working}>
              {state.working
                ? 'Marcando…'
                : `Marcar ${state.selectedRows.length} como ${state.selectedRows.length === 1 ? 'entregada' : 'entregadas'}`}
            </Button>
          </div>
        </div>
      ) : null}

      {state.undoable.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            En esta sesión marcaste{' '}
            <strong className="font-semibold text-foreground">
              {state.undoable.length}{' '}
              {state.undoable.length === 1 ? 'operación' : 'operaciones'}
            </strong>
            . Deshacer las devuelve a pendiente; al recargar la página se deshace desde la
            operación.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={actions.undoSession}
            disabled={state.working}
            className="shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Deshacer todo lo de esta sesión
          </Button>
        </div>
      ) : null}

      {hasOpenLoan ? (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-card p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Este cliente además tiene un{' '}
            <strong className="font-semibold text-foreground">préstamo abierto</strong>. Son cosas
            distintas: el préstamo es plata que él nos debe, esto es plata que le debemos. No se
            compensan solas — si quieres cruzarlas, se hace desde la pestaña Préstamos y queda
            registrado.
          </p>
        </div>
      ) : null}

      <SidePanel open={covering !== null} onOpenChange={(open) => !open && setCovering(null)}>
        <SidePanelHeader>
          <h2 className="text-base font-semibold text-foreground">Cuadrar la operación</h2>
          <p className="text-xs text-muted-foreground">
            Elige los comprobantes que la pagan. La tasa sale de la suma.
          </p>
        </SidePanelHeader>
        {covering ? (
          <OperationCoveragePanel
            operationUuid={covering}
            onSaved={() => {
              setCovering(null);
              onChanged();
            }}
            onCancel={() => setCovering(null)}
          />
        ) : null}
      </SidePanel>
    </div>
  );
}
