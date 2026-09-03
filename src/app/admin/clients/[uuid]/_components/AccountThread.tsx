'use client';

import Link from 'next/link';
import { ArrowDownCircle, ArrowUpCircle, Receipt } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';
import { formatCaracasShortDateTime } from '@/utils/functions';
import type { BalanceEntry } from '@/types/client';
import type { OperationData } from '@/types/operation';
import { STATE_LABEL, operationState, type AccountItem, type OperationState } from '../../_lib/account';
import {
  coveredAmount,
  formatPending,
  outstandingAmount,
  valueAmount,
  valueCurrency,
} from '../../_lib/pending';
import { ACCOUNT_COL as COL, ACCOUNT_GRID as GRID, ACCOUNT_TABLE_MIN as TABLE_MIN } from './accountTable';

interface AccountThreadProps {
  items: AccountItem[];
  emptyLabel: string;
}

const STATE_TONE: Record<OperationState, string> = {
  pending: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  // El mismo ámbar que le pone la bandeja de Pagos a `status = PENDING`: es el mismo
  // estado, leído del mismo campo, y en dos pantallas tiene que verse igual.
  open: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  delivered: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  quoted: 'border-border bg-muted text-muted-foreground',
  cancelled: 'border-border bg-muted text-muted-foreground',
};

/** Debajo de esto es ruido de redondeo, no dinero. Igual que en el backend y en `pending`. */
const EPSILON = 0.01;

function formatUsd(value: number) {
  return `$${value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', className)}>
      {children}
    </span>
  );
}

/** La cabecera de columnas, la misma que la cola de «Por entregar». Sólo en ≥lg. */
function ThreadHeader() {
  return (
    <div
      className={cn(
        GRID,
        'hidden border-b border-border bg-muted/40 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground lg:grid lg:px-3',
      )}
    >
      <span className={COL.check} />
      <span className={COL.when}>Fecha</span>
      <span className={COL.value}>Valor</span>
      <span className={COL.state}>Estado</span>
      <span className={cn(COL.action, 'text-right')}>Acción</span>
    </div>
  );
}

/**
 * Una operación en el hilo. Es una lectura, no una cola de trabajo: enseña el trato y en
 * qué estado quedó, y para actuar se entra en la operación o se filtra por «Por entregar».
 *
 * Se lee EXACTAMENTE igual que una fila de la cola —mismos anchos en ≥lg, el valor tachado
 * cuando ya está cubierto—: cambiar de chip filtra la lista, no la rehace. Por debajo de
 * `lg` comparte también la misma tarjeta de dos líneas que `PendingWorkList`: la rejilla
 * de columnas envolvía igual de roto aquí, y el comentario de `accountTable.ts` es
 * literal — un ancho que cambia ahí cambia las dos listas a la vez.
 */
function OperationRow({ operation, at }: { operation: OperationData; at: string | null }) {
  const state = operationState(operation);
  const pending = outstandingAmount(operation);
  const value = valueAmount(operation);
  const covered = coveredAmount(operation);
  const currency = valueCurrency(operation);
  const partial = state === 'pending' && covered > EPSILON;
  // El tachón dice «no queda nada por cubrir», y eso lo decide el pendiente y nada más.
  // Atarlo al estado tachaba el valor de una operación con 50 sin cubrir sólo porque su
  // dinero todavía no había entrado y por eso no estaba en la cola.
  const settled = pending <= EPSILON;
  const stateWord = partial
    ? 'Parcial'
    : state === 'delivered' && operation.settles_in_cash
      ? 'Cobrada'
      : STATE_LABEL[state];

  return (
    <div className={cn(GRID, 'border-b border-border px-2 py-2 last:border-b-0 sm:px-3')}>
      <span className={cn(COL.check, 'hidden lg:block')} aria-hidden />

      <div className={cn(COL.when, 'hidden lg:block')}>
        <Link
          href={`/admin/operations/${operation.uuid}`}
          className="block truncate text-sm text-foreground hover:underline"
        >
          {formatCaracasShortDateTime(at)}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          {operation.beneficiary_alias || 'Sin beneficiario'}
          {operation.pair_symbol ? ` · ${operation.pair_symbol}` : ''}
        </p>
      </div>

      <div className={cn(COL.value, 'hidden tabular-nums lg:block')}>
        {state === 'pending' ? (
          partial ? (
            <p className="text-sm">
              <s className="text-muted-foreground">{formatPending(value, null)}</s>{' '}
              <span className="font-bold text-amber-700 dark:text-amber-400">
                {formatPending(pending, currency)}
              </span>
            </p>
          ) : (
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
              {formatPending(value, currency)}
            </p>
          )
        ) : settled ? (
          <p className="text-sm">
            <s className="text-muted-foreground">{formatPending(value, currency)}</s>{' '}
            {/* «Completado» sólo cuando la operación está cerrada de verdad. Una cubierta
                pero en PENDING —una USD-VES esperando los billetes— se queda con el valor
                tachado y su chip: cubierta no es completada. */}
            {state === 'delivered' ? (
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                Completado
              </span>
            ) : null}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{formatPending(value, currency)}</p>
        )}
      </div>

      <div className={cn(COL.state, 'hidden lg:block')}>
        {/* «Parcial» y no «Por entregar»: es la misma palabra que usa la cola de trabajo
            para esta misma operación, y verla cambiar al pasar de un chip a otro hacía
            dudar de si eran la misma fila. */}
        <Chip className={STATE_TONE[state]}>{stateWord}</Chip>
      </div>

      <div className={cn('hidden items-center lg:flex', COL.action)}>
        <Link
          href={`/admin/operations/${operation.uuid}`}
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-xs')}
        >
          Ver
        </Link>
      </div>

      {/* La tarjeta móvil: arriba fecha y cifra, abajo beneficiario (con el estado en
          palabras) y la acción — la misma forma que una fila de la cola. */}
      <div className="flex w-full basis-full flex-col gap-1.5 lg:hidden">
        <div className="flex items-baseline justify-between gap-2">
          <Link
            href={`/admin/operations/${operation.uuid}`}
            className="truncate text-sm text-foreground hover:underline"
          >
            {formatCaracasShortDateTime(at)}
          </Link>
          {state === 'pending' ? (
            <span
              className={cn(
                'shrink-0 text-sm font-bold tabular-nums',
                'text-amber-700 dark:text-amber-400',
              )}
            >
              {formatPending(partial ? pending : value, currency)}
            </span>
          ) : (
            <span className="shrink-0 text-sm">
              <s className="text-muted-foreground">{formatPending(value, currency)}</s>{' '}
              {state === 'delivered' ? (
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Completado
                </span>
              ) : null}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-xs text-muted-foreground">
            {operation.beneficiary_alias || 'Sin beneficiario'}
            {operation.pair_symbol ? ` · ${operation.pair_symbol}` : ''} · {stateWord}
          </span>
          <Link
            href={`/admin/operations/${operation.uuid}`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-8 shrink-0 text-xs')}
          >
            Ver
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Un movimiento del saldo a favor. Mismo hilo, mismos anchos que una operación en ≥lg, y
 * la misma tarjeta de dos líneas por debajo.
 */
function BalanceRow({ entry }: { entry: BalanceEntry }) {
  const isCredit = entry.entry_type === 'CREDIT';
  const tone = isCredit
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-amber-600 dark:text-amber-400';
  const detail = [
    entry.incoming_payment_id != null ? `Pago entrante #${entry.incoming_payment_id}` : null,
    entry.operation_uuid ? `op ${entry.operation_uuid.slice(0, 8)}` : null,
    entry.created_by_username || (isCredit ? 'crédito' : 'abono'),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className={cn(GRID, 'border-b border-border px-2 py-2 last:border-b-0 sm:px-3')}>
      <span className={cn(COL.check, 'hidden items-center justify-center lg:flex')} aria-hidden>
        {isCredit ? (
          <ArrowDownCircle className={cn('h-4 w-4', tone)} />
        ) : (
          <ArrowUpCircle className={cn('h-4 w-4', tone)} />
        )}
      </span>

      <div className={cn(COL.when, 'hidden lg:block')}>
        <p className="truncate text-sm text-foreground">
          {formatCaracasShortDateTime(entry.created_at)}
        </p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>

      <div className={cn(COL.value, 'hidden tabular-nums lg:block')}>
        <p className={cn('text-sm font-semibold', tone)}>
          {isCredit ? '+' : '−'}
          {formatUsd(entry.amount)}
        </p>
        {/* A qué tasa se aplicó el saldo: esta es la única pantalla donde se puede ver. */}
        {!isCredit && entry.operation_rate_used != null ? (
          <p className="text-[11px] text-muted-foreground">
            @ {entry.operation_rate_used.toLocaleString('es-VE', { maximumFractionDigits: 4 })}
          </p>
        ) : null}
      </div>

      <div className={cn(COL.state, 'hidden lg:block')}>
        <Chip className="border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400">
          {isCredit ? 'Crédito' : 'Abono'}
        </Chip>
      </div>

      <div className={cn('hidden items-center lg:flex', COL.action)}>
        {entry.notes ? (
          <span className="truncate text-xs text-muted-foreground" title={entry.notes}>
            {entry.notes}
          </span>
        ) : null}
      </div>

      <div className="flex w-full basis-full flex-col gap-1.5 lg:hidden">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm text-foreground">
            {formatCaracasShortDateTime(entry.created_at)}
          </span>
          <span className={cn('shrink-0 text-sm font-semibold', tone)}>
            {isCredit ? '+' : '−'}
            {formatUsd(entry.amount)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-xs text-muted-foreground">
            {detail} · {isCredit ? 'crédito' : 'abono'}
            {!isCredit && entry.operation_rate_used != null
              ? ` · @ ${entry.operation_rate_used.toLocaleString('es-VE', { maximumFractionDigits: 4 })}`
              : ''}
          </span>
          {entry.notes ? (
            <span className="max-w-[40%] shrink-0 truncate text-xs text-muted-foreground" title={entry.notes}>
              {entry.notes}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AccountThread({ items, emptyLabel }: AccountThreadProps) {
  if (items.length === 0) {
    return <EmptyState icon={Receipt} title="Nada que mostrar" description={emptyLabel} />;
  }

  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="overflow-x-auto p-0">
        <div className={TABLE_MIN}>
          <ThreadHeader />
          {items.map((item) =>
            item.kind === 'operation' ? (
              <OperationRow key={item.key} operation={item.operation} at={item.displayAt} />
            ) : (
              <BalanceRow key={item.key} entry={item.entry} />
            ),
          )}
        </div>
      </CardContent>
    </Card>
  );
}
