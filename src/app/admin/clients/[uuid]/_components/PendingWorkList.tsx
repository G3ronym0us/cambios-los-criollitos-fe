'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, HandCoins, Minus, PartyPopper, Receipt, RotateCcw } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  outstandingAmount,
  pendingSince,
  pendingTone,
  valueAmount,
  valueCurrency,
  waitedFor,
} from '../../_lib/pending';
import { blockedReason, type useClientPending } from '../_hooks/useClientPending';
import { DistributeAmountPanel } from './DistributeAmountPanel';
import { ACCOUNT_COL as COL, ACCOUNT_GRID as GRID, ACCOUNT_TABLE_MIN as TABLE_MIN } from './accountTable';

type PendingHook = ReturnType<typeof useClientPending>;

interface PendingWorkListProps {
  state: PendingHook['state'];
  actions: PendingHook['actions'];
  onChanged: () => void;
  /** El par de la cuenta, para el selector que en móvil vive junto a «Repartir un monto». */
  pairs?: string[];
  pair?: string;
  onPairChange?: (pair: string) => void;
}

/** El `<Select>` no admite valor vacío, y «todos los pares» es justo el par sin elegir. */
const ALL_PAIRS = '__all__';

function Checkbox({
  checked,
  indeterminate,
  disabled,
  label,
  onChange,
  hiddenBelowLg,
}: {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
  /** La casilla del diseño desktop no aparece en móvil hasta que se enciende la selección
   *  (5c): en la cola de siempre (5b) esa columna la ocupa el botón de la fila. */
  hiddenBelowLg?: boolean;
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
        'h-11 w-11 shrink-0 items-center justify-center rounded-md disabled:cursor-not-allowed',
        hiddenBelowLg ? 'hidden lg:flex' : 'flex',
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
 * En ≥lg cae en la rejilla de siempre. Por debajo, esa rejilla se esconde entera y se
 * pinta una tarjeta de dos líneas aparte —no la misma fila envuelta—: arriba fecha y
 * cifra, abajo beneficiario (con el estado escrito en palabras) y la acción, del ancho de
 * su texto. Sin selección encendida no hay casilla que pintar: cada fila lleva su propio
 * botón (`Cubrir`, `Completar`, `Pedir datos`…), que es lo que enseña `selecting=false`.
 * Con la selección encendida esa acción se apaga y aparece la casilla — la fila entera se
 * vuelve el objetivo del toque, no un cuadradito de 20 px. Las filas que no se pueden
 * marcar (trabadas o ya saldadas, ahí sólo para deshacer) se quedan con su botón propio
 * pase lo que pase: perderlo en medio de una selección sería quedarse sin salida.
 */
function PendingRow({
  operation,
  since,
  checked,
  undoable,
  working,
  selecting,
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
  /** Selección encendida en móvil: cambia la tarjeta de «botón propio» a «casilla». */
  selecting: boolean;
  onToggle: () => void;
  onCover: () => void;
  onMark: () => void;
  onUndo: () => void;
}) {
  const blocked = blockedReason(operation);
  const currency = valueCurrency(operation);
  const pending = outstandingAmount(operation);
  const covered = coveredAmount(operation);
  const value = valueAmount(operation);
  // Ya no debe nada: sigue en la cola sólo para poder deshacerla.
  const done = !isPendingOperation(operation);
  const partial = !done && covered > 0.01;
  const alert = pendingTone(since) === 'destructive';
  // En efectivo no hay comprobante que atar: el camino corto es marcarla y ya.
  const cash = operation.settles_in_cash;
  const waited = waitedFor(since);
  // Sólo estas se pueden marcar; las demás siguen en la tarjeta de botón propio aunque la
  // selección esté encendida, para no dejarlas sin acción a mano.
  const selectable = !blocked && !done;
  const asCheckbox = selecting && selectable;

  // El resumen que en escritorio da la columna Estado, pero en palabras dentro de la
  // segunda línea: «espera 6 d», «parcial · de 171.240,00 · espera 5 d», «falta dato ·
  // fuera de «seleccionar todas»». Las saldadas no llevan nada aquí — ya lo dice el valor.
  const statusText = done
    ? null
    : blocked
      ? `${blocked} · fuera de «seleccionar todas»`
      : partial
        ? `parcial · de ${formatPending(value, null)}${waited ? ` · espera ${waited}` : ''}`
        : waited
          ? `espera ${waited}`
          : null;

  const actionButton = undoable ? (
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
  );

  return (
    <div className={cn(GRID, 'border-b border-border px-2 py-2 last:border-b-0 sm:px-3')}>
      <Checkbox
        checked={checked}
        disabled={!!blocked || done}
        label={`Seleccionar operación del ${formatCaracasShortDateTime(since)}`}
        onChange={onToggle}
        hiddenBelowLg
      />

      {/* La fecha es también el enlace a la operación: sin la columna del id habría que
          salir de la pantalla para llegar al detalle. Sólo en ≥lg — en móvil la sustituye
          la tarjeta de abajo. */}
      <div className={cn(COL.when, 'hidden lg:block')}>
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

      <div className={cn(COL.value, 'hidden tabular-nums lg:block')}>
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

      <div className={cn(COL.state, 'hidden lg:block')}>
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

      <div className={cn('hidden items-center gap-1 lg:flex', COL.action)}>{actionButton}</div>

      {/* La tarjeta móvil. Dos variantes según `asCheckbox`: con botón propio (5b) o con
          casilla y la fila entera como objetivo del toque (5c). */}
      {asCheckbox ? (
        // Toda la tarjeta es el botón — no una casilla de 20 px dentro de otra cosa. La
        // marca de abajo es sólo visual: anidar un `<button>` de verdad ahí sería HTML
        // inválido (botón dentro de botón) además de dos objetivos de toque compitiendo.
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={`Seleccionar operación del ${formatCaracasShortDateTime(since)}`}
          onClick={onToggle}
          className="flex w-full basis-full items-center gap-3 rounded-lg py-1 text-left lg:hidden"
        >
          <span
            aria-hidden
            className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
              checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40 bg-card',
            )}
          >
            {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3.5} /> : null}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-foreground">
              {formatCaracasShortDateTime(since)}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {operation.beneficiary_alias || 'Sin beneficiario'}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span
              className={cn(
                'block text-sm font-bold tabular-nums',
                alert ? 'text-destructive' : 'text-amber-700 dark:text-amber-400',
              )}
            >
              {formatPending(pending, currency)}
            </span>
            <span className="block text-xs text-muted-foreground">
              {checked ? 'Se marcará' : partial ? 'Parcial' : 'Pendiente'}
            </span>
          </span>
        </button>
      ) : (
        <div className="flex w-full basis-full flex-col gap-1.5 lg:hidden">
          <div className="flex items-baseline justify-between gap-2">
            <Link
              href={`/admin/operations/${operation.uuid}`}
              className={cn(
                'truncate text-sm hover:underline',
                alert && !done ? 'font-semibold text-destructive' : 'text-foreground',
              )}
            >
              {formatCaracasShortDateTime(since)}
            </Link>
            {done ? (
              <span className="shrink-0 text-sm">
                <s className="text-muted-foreground">{formatPending(value, currency)}</s>{' '}
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Completado
                </span>
              </span>
            ) : (
              <span
                className={cn(
                  'shrink-0 text-sm font-bold tabular-nums',
                  alert ? 'text-destructive' : 'text-amber-700 dark:text-amber-400',
                )}
              >
                {formatPending(partial ? pending : value, currency)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-xs text-muted-foreground">
              {operation.beneficiary_alias || 'Sin beneficiario'}
              {statusText ? ` · ${statusText}` : ''}
            </span>
            <span className="flex shrink-0 items-center gap-1">{actionButton}</span>
          </div>
        </div>
      )}
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
export function PendingWorkList({
  state,
  actions,
  onChanged,
  pairs = [],
  pair = '',
  onPairChange,
}: PendingWorkListProps) {
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
  // En móvil no hay casilla de fila hasta que hay algo marcado: la que la enciende es la
  // cabecera de «seleccionar todas», que sí está siempre a mano.
  const selecting = state.selectedRows.length > 0;
  const blockedCount = state.rows.filter(
    (op) => isPendingOperation(op) && blockedReason(op) !== null,
  ).length;
  // Con un solo par a la vista el pie puede nombrarlo; con varios sería mentira.
  const pairLabel = state.entries.length === 1 ? state.entries[0].pair_symbol : null;

  return (
    <div className="space-y-4">
      {/* Barra de la cola: sólo la acción que cambia de modo, y sólo en modo lista — el
          panel de reparto trae su propio «volver». Cuánto se debe está arriba, en la
          cabecera de Cuenta, común a todos los filtros. El selector de par también vive
          ahí en ≥lg; en móvil baja aquí, que es donde el diseño lo pone. */}
      {state.mode === 'select' ? (
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => actions.setMode('distribute')}>
            <HandCoins className="h-4 w-4" />
            Repartir un monto
          </Button>
          {pairs.length > 0 && onPairChange ? (
            <Select
              value={pair === '' ? ALL_PAIRS : pair}
              onValueChange={(value) => onPairChange(value === ALL_PAIRS ? '' : (value as string))}
            >
              <SelectTrigger
                aria-label="Par de monedas"
                className="h-9 w-auto min-w-32 shrink-0 rounded-full lg:hidden"
              >
                <SelectValue placeholder="Todos los pares" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PAIRS}>Todos los pares</SelectItem>
                {pairs.map((symbol) => (
                  <SelectItem key={symbol} value={symbol}>
                    {symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
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

            {/* El equivalente móvil de `ListHeader`: la única casilla que está siempre a
                mano, y la que enciende las de cada fila (5c). Tocarla con todo apagado
                selecciona todo — es el punto de entrada; de ahí en más se afina fila a
                fila, que ya sí muestra su casilla. */}
            <div className="flex min-h-11 items-center gap-2 border-b border-border bg-muted/40 px-2 py-1.5 lg:hidden">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                disabled={state.selectable.length === 0}
                label="Seleccionar todas las operaciones entregables"
                onChange={allSelected ? actions.clearSelection : actions.selectAll}
              />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                Seleccionar {state.selectable.length === 1 ? 'la' : 'las'} {state.selectable.length}{' '}
                {state.selectable.length === 1 ? 'entregable' : 'entregables'}
              </span>
              {blockedCount > 0 ? (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {blockedCount} {blockedCount === 1 ? 'trabada' : 'trabadas'}
                </span>
              ) : null}
            </div>

            {state.rows.map((operation) => (
              <PendingRow
                key={operation.uuid}
                operation={operation}
                since={pendingSince(operation)}
                checked={state.selected.has(operation.uuid)}
                undoable={state.deliveryByOperation.has(operation.uuid)}
                working={state.working}
                selecting={selecting}
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
          abajo para no perderla al hacer scroll por una lista larga, con hueco para el
          gesto del sistema. En móvil el primario ocupa la fila entera —«Marcar N como
          entregadas» no cabe partido en dos líneas junto a los otros dos— y los
          secundarios se reparten la fila de abajo. */}
      {state.mode === 'select' && state.selectedRows.length > 0 ? (
        <div className="sticky bottom-3 z-10 space-y-3 rounded-xl bg-foreground p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-background shadow-lg sm:flex sm:items-center sm:justify-between sm:space-y-0">
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
          <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row-reverse">
            <Button
              className="h-11 w-full sm:h-9 sm:w-auto"
              onClick={actions.markSelected}
              disabled={state.working}
            >
              {state.working
                ? 'Marcando…'
                : `Marcar ${state.selectedRows.length} como ${state.selectedRows.length === 1 ? 'entregada' : 'entregadas'}`}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="h-11 flex-1 sm:h-9 sm:flex-none"
                onClick={actions.clearSelection}
              >
                Quitar selección
              </Button>
              {!allSelected ? (
                <Button
                  variant="ghost"
                  className="h-11 flex-1 sm:h-9 sm:flex-none"
                  onClick={actions.selectAll}
                >
                  Seleccionar todas ({state.selectable.length})
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Las entregas que siguen en pie, con su deshacer. Vienen del servidor, así que
          siguen ahí mañana: el error que se descubre tarde ya no obliga a entrar operación
          por operación al panel de cobertura. Se enseñan las últimas cinco.
          En móvil la frase ya ocupa dos líneas y el botón no cabe a su lado con 28 px de
          alto: se apila —descripción arriba, botón de 44 px debajo— con un separador entre
          entregas en vez del hueco a medias de antes. El texto no se acorta: para decidir
          si hay que deshacer hay que poder reconocer qué se marcó. */}
      {state.undoable.length > 0 ? (
        <div className="rounded-lg border border-border bg-muted p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Entregas marcadas
          </p>
          <div className="mt-2 divide-y divide-border">
            {state.undoable.slice(0, 5).map((delivery) => (
              <div
                key={delivery.uuid}
                className="flex flex-col gap-2 py-3 first:pt-2 sm:flex-row sm:items-center sm:justify-between sm:py-2"
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
                  onClick={() => actions.undoDelivery(delivery)}
                  disabled={state.working}
                  className="h-11 w-full shrink-0 sm:h-8 sm:w-auto"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Deshacer esta entrega
                </Button>
              </div>
            ))}
          </div>
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
