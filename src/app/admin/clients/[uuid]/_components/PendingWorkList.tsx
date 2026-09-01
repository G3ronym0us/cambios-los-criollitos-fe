'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, HandCoins, Minus, PartyPopper, Receipt, RotateCcw } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { SidePanel, SidePanelHeader } from '@/components/shared/SidePanel';
import { cn } from '@/lib/utils';
import { formatCaracasShortDateTime, formatRelativeTime } from '@/utils/functions';
import type { OperationData } from '@/types/operation';
import { OperationCoveragePanel } from '../../../operations/_components/OperationCoveragePanel';
import {
  coveredAmount,
  formatPending,
  formatPendingBreakdown,
  isPendingOperation,
  pendingSince,
  pendingTone,
  valueAmount,
  valueCurrency,
} from '../../_lib/pending';
import { blockedReason, type useClientPending } from '../_hooks/useClientPending';
import { DistributeAmountPanel } from './DistributeAmountPanel';
import { ACCOUNT_COL as COL, ACCOUNT_GRID as GRID, ACCOUNT_TABLE_MIN as TABLE_MIN } from './accountTable';

type PendingHook = ReturnType<typeof useClientPending>;

interface PendingWorkListProps {
  state: PendingHook['state'];
  actions: PendingHook['actions'];
  onChanged: () => void;
}

function Checkbox({
  checked,
  indeterminate,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
}) {
  const marked = checked || !!indeterminate;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
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
            : marked
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground/40 bg-card',
        )}
      >
        {indeterminate ? (
          <Minus className="h-3 w-3" strokeWidth={3.5} />
        ) : checked ? (
          <Check className="h-3 w-3" strokeWidth={3.5} />
        ) : null}
      </span>
    </button>
  );
}

/** Un estado de fila del diseño: qué le va a pasar a esta operación si confirmas. */
function StateChip({
  tone,
  children,
}: {
  tone: 'go' | 'done' | 'warn' | 'blocked';
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'rounded-full border px-2 py-0.5 text-[11px] font-medium',
        tone === 'go' && 'border-primary/40 bg-primary/10 text-primary',
        tone === 'done' &&
          'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        tone === 'warn' &&
          'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
        tone === 'blocked' && 'border-border bg-muted text-muted-foreground',
      )}
    >
      {children}
    </span>
  );
}

/** La cabecera de columnas del diseño. Sólo en ≥lg: es lo que sustituye a las etiquetas. */
function ListHeader({
  checked,
  indeterminate,
  disabled,
  onToggleAll,
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  onToggleAll: () => void;
}) {
  return (
    <div
      className={cn(
        GRID,
        'hidden border-b border-border bg-muted/40 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground lg:grid lg:px-3',
      )}
    >
      <div className={COL.check}>
        <Checkbox
          checked={checked}
          indeterminate={indeterminate}
          disabled={disabled}
          label="Seleccionar todas las operaciones entregables"
          onChange={onToggleAll}
        />
      </div>
      <span className={COL.when}>Fecha</span>
      <span className={COL.value}>Valor</span>
      <span className={COL.state}>Estado</span>
      <span className={cn(COL.action, 'text-right')}>Acción</span>
    </div>
  );
}

/**
 * Una operación sin cubrir, como fila.
 *
 * Cuatro columnas: cuándo fue, cuánto vale, en qué estado está y qué se puede hacer. El
 * identificador de la operación y el «lleva 6 d esperando» se cayeron a propósito — la
 * fecha ya dice lo uno y lo otro, y ocupaban una columna entera para repetirlo.
 *
 * **El valor cuenta la historia él solo**, que es lo que evita tener que cruzar tres
 * columnas de cifras para entender una fila:
 *
 *     pendiente   130,00 USD
 *     parcial     ~~100,00~~  60,00 USD     ← tachado el trato, en pie lo que falta
 *     saldada     ~~130,00~~  Completado
 *
 * En móvil la fila envuelve y cada trozo lleva su etiqueta; en ≥lg cae en la rejilla.
 */
function PendingRow({
  operation,
  since,
  checked,
  undoable,
  working,
  onToggle,
  onCover,
  onMark,
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
  onMark: () => void;
  onUndo: () => void;
}) {
  const blocked = blockedReason(operation);
  const currency = valueCurrency(operation);
  const pending = operation.pending_amount ?? 0;
  const covered = coveredAmount(operation);
  const value = valueAmount(operation);
  // Ya no debe nada: sigue en la cola sólo para poder deshacerla.
  const done = !isPendingOperation(operation);
  const partial = !done && covered > 0.01;
  const alert = pendingTone(since) === 'destructive';
  // En efectivo no hay comprobante que atar: el camino corto es marcarla y ya.
  const cash = operation.settles_in_cash;

  return (
    <div className={cn(GRID, 'border-b border-border px-2 py-2 last:border-b-0 sm:px-3')}>
      <Checkbox
        checked={checked}
        disabled={!!blocked || done}
        label={`Seleccionar operación del ${formatCaracasShortDateTime(since)}`}
        onChange={onToggle}
      />

      {/* La fecha es también el enlace a la operación: sin la columna del id habría que
          salir de la pantalla para llegar al detalle. */}
      <div className={COL.when}>
        <Link
          href={`/admin/operations/${operation.uuid}`}
          className={cn(
            'block truncate text-sm hover:underline',
            alert && !done ? 'font-semibold text-destructive' : 'text-foreground',
          )}
        >
          {formatCaracasShortDateTime(since)}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          {operation.beneficiary_alias || 'Sin beneficiario'}
        </p>
      </div>

      <div className={cn(COL.value, 'tabular-nums')}>
        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground lg:hidden">
          Valor
        </span>
        {done ? (
          <p className="text-sm">
            <s className="text-muted-foreground">{formatPending(value, currency)}</s>{' '}
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              Completado
            </span>
          </p>
        ) : partial ? (
          <p className="text-sm">
            <s className="text-muted-foreground">{formatPending(value, null)}</s>{' '}
            <span
              className={cn(
                'font-bold',
                alert ? 'text-destructive' : 'text-amber-700 dark:text-amber-400',
              )}
            >
              {formatPending(pending, currency)}
            </span>
          </p>
        ) : (
          <p
            className={cn(
              'text-sm font-bold',
              alert ? 'text-destructive' : 'text-amber-700 dark:text-amber-400',
            )}
          >
            {formatPending(value, currency)}
          </p>
        )}
      </div>

      <div className={COL.state}>
        {done ? (
          <StateChip tone="done">{cash ? 'Cobrada' : 'Entregada'}</StateChip>
        ) : blocked ? (
          <StateChip tone="blocked">Falta dato</StateChip>
        ) : checked ? (
          <StateChip tone="go">Se marcará</StateChip>
        ) : partial ? (
          <StateChip tone="warn">Parcial</StateChip>
        ) : (
          <StateChip tone="blocked">Pendiente</StateChip>
        )}
      </div>

      <div className={cn('flex items-center gap-1', COL.action)}>
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
            Pedir datos
          </Link>
        ) : cash ? (
          <>
            {/* En efectivo el gesto de un vistazo es «ya me pagó». El panel de cobertura
                sigue a mano en el icono, para el día que sí haya comprobante. */}
            <Button size="sm" onClick={onMark} disabled={working}>
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
              Pagado
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="Cuadrar con comprobantes"
              title="Cuadrar con comprobantes"
              onClick={onCover}
            >
              <Receipt className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button variant={partial ? 'outline' : 'default'} size="sm" onClick={onCover}>
            {partial ? 'Completar' : 'Cubrir'}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * El filtro «Por entregar» de Cuenta, que no es un histórico sino una cola de trabajo:
 * pocas filas, todas accionables, de la más vieja a la más nueva.
 *
 * «Cubrir» abre el panel de cobertura de siempre —el que ata comprobantes de verdad—; las
 * casillas y el reparto son el otro camino, el de la entrega en efectivo sin comprobante.
 *
 * El estado vive arriba, en Cuenta: la cabecera de la pestaña ofrece «Entregar todo», y
 * eso sólo puede encender la selección de esta lista si la selección no es suya.
 */
export function PendingWorkList({ state, actions, onChanged }: PendingWorkListProps) {
  const [covering, setCovering] = useState<string | null>(null);

  if (state.rows.length === 0) {
    return (
      <EmptyState
        icon={PartyPopper}
        title="No le debemos nada"
        description="Todas sus operaciones de este par están cubiertas."
      />
    );
  }

  const allSelected =
    state.selectable.length > 0 && state.selectedRows.length === state.selectable.length;
  const someSelected = state.selectedRows.length > 0 && !allSelected;
  // Con un solo par a la vista el pie puede nombrarlo; con varios sería mentira.
  const pairLabel = state.entries.length === 1 ? state.entries[0].pair_symbol : null;

  return (
    <div className="space-y-4">
      {/* Barra de la cola: sólo la acción que cambia de modo, y sólo en modo lista — el
          panel de reparto trae su propio «volver». Cuánto se debe y el selector de par
          están arriba, en la cabecera de Cuenta, comunes a todos los filtros. */}
      {state.mode === 'select' ? (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => actions.setMode('distribute')}>
            <HandCoins className="h-4 w-4" />
            Repartir un monto
          </Button>
        </div>
      ) : null}

      {state.mode === 'distribute' ? (
        <DistributeAmountPanel state={state} actions={actions} />
      ) : (
        <Card className="overflow-hidden py-0">
          <CardContent className="overflow-x-auto p-0">
            <div className={TABLE_MIN}>
            <ListHeader
              checked={allSelected}
              indeterminate={someSelected}
              disabled={state.selectable.length === 0}
              onToggleAll={allSelected ? actions.clearSelection : actions.selectAll}
            />

            {state.rows.map((operation) => (
              <PendingRow
                key={operation.uuid}
                operation={operation}
                since={pendingSince(operation)}
                checked={state.selected.has(operation.uuid)}
                undoable={state.deliveryByOperation.has(operation.uuid)}
                working={state.working}
                onToggle={() => actions.toggle(operation.uuid)}
                onCover={() => setCovering(operation.uuid)}
                onMark={() => actions.markOne(operation.uuid)}
                onUndo={() => actions.undoOne(operation.uuid)}
              />
            ))}

            {/* El pie del diseño: cuántas quedan sin cubrir y cuánto suman, sin tener que
                volver a la cabecera después de bajar por la lista. */}
            {state.totals.operations > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/40 px-2 py-2 text-xs sm:px-3">
                <span className="text-muted-foreground">
                  {state.totals.operations}{' '}
                  {state.totals.operations === 1 ? 'operación' : 'operaciones'}
                  {pairLabel ? ` ${pairLabel}` : ''} sin cubrir
                </span>
                <span className="font-bold tabular-nums text-foreground">
                  {formatPendingBreakdown(state.entries)}
                </span>
              </div>
            ) : null}
            </div>
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
            {!allSelected ? (
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

      {/* Las entregas que siguen en pie, con su deshacer. Vienen del servidor, así que
          siguen ahí mañana: el error que se descubre tarde ya no obliga a entrar operación
          por operación al panel de cobertura. Se enseñan las últimas cinco. */}
      {state.undoable.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-border bg-muted p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Entregas marcadas
          </p>
          {state.undoable.slice(0, 5).map((delivery) => (
            <div
              key={delivery.uuid}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              {/* Qué se marcó, no sólo cuántas: para decidir si hay que deshacer hay que
                  reconocer la operación, y «1 operación» no se reconoce. */}
              <p className="min-w-0 text-xs text-muted-foreground">
                <strong className="font-semibold text-foreground">
                  {delivery.operations}{' '}
                  {delivery.operations === 1 ? 'operación' : 'operaciones'} ·{' '}
                  {formatPending(delivery.amount, delivery.items[0]?.currency ?? null)}
                </strong>{' '}
                ({delivery.items
                  .slice(0, 3)
                  .map((item) => item.operation_uuid?.slice(0, 8) ?? '—')
                  .join(', ')}
                {delivery.operations > 3 ? ` y ${delivery.operations - 3} más` : ''}){' '}
                {formatRelativeTime(delivery.created_at)}
                {delivery.created_by_username ? ` · ${delivery.created_by_username}` : ''}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => actions.undoDelivery(delivery)}
                disabled={state.working}
                className="shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Deshacer
              </Button>
            </div>
          ))}
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
