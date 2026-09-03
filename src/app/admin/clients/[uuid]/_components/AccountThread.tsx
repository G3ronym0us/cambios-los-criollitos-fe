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
 * Se lee EXACTAMENTE igual que una fila de la cola —mismas columnas, mismos anchos, el
 * valor tachado cuando ya está cubierto—: cambiar de chip filtra la lista, no la rehace.
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

  return (
    <div className={cn(GRID, 'border-b border-border px-2 py-2 last:border-b-0 sm:px-3')}>
      <span className={COL.check} aria-hidden />

      <div className={COL.when}>
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

      <div className={cn(COL.value, 'tabular-nums')}>
        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground lg:hidden">
          Valor
        </span>
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

      <div className={COL.state}>
        {/* «Parcial» y no «Por entregar»: es la misma palabra que usa la cola de trabajo
            para esta misma operación, y verla cambiar al pasar de un chip a otro hacía
            dudar de si eran la misma fila. */}
        <Chip className={STATE_TONE[state]}>
          {partial
            ? 'Parcial'
            : state === 'delivered' && operation.settles_in_cash
              ? 'Cobrada'
              : STATE_LABEL[state]}
        </Chip>
      </div>

      <div className={cn('flex items-center', COL.action)}>
        <Link
          href={`/admin/operations/${operation.uuid}`}
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-xs')}
        >
          Ver
        </Link>
      </div>
    </div>
  );
}

/** Un movimiento del saldo a favor. Mismo hilo, mismas columnas que una operación. */
function BalanceRow({ entry }: { entry: BalanceEntry }) {
  const isCredit = entry.entry_type === 'CREDIT';
  const tone = isCredit
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-amber-600 dark:text-amber-400';

  return (
    <div className={cn(GRID, 'border-b border-border px-2 py-2 last:border-b-0 sm:px-3')}>
      <span className={cn(COL.check, 'flex items-center justify-center')} aria-hidden>
        {isCredit ? (
          <ArrowDownCircle className={cn('h-4 w-4', tone)} />
        ) : (
          <ArrowUpCircle className={cn('h-4 w-4', tone)} />
        )}
      </span>

      <div className={COL.when}>
        <p className="truncate text-sm text-foreground">
          {formatCaracasShortDateTime(entry.created_at)}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {entry.incoming_payment_id != null ? `Pago entrante #${entry.incoming_payment_id} · ` : ''}
          {entry.operation_uuid ? `op ${entry.operation_uuid.slice(0, 8)} · ` : ''}
          {entry.created_by_username || (isCredit ? 'crédito' : 'abono')}
        </p>
      </div>

      <div className={cn(COL.value, 'tabular-nums')}>
        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground lg:hidden">
          Valor
        </span>
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

      <div className={COL.state}>
        <Chip className="border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400">
          {isCredit ? 'Crédito' : 'Abono'}
        </Chip>
      </div>

      <div className={cn('flex items-center', COL.action)}>
        {entry.notes ? (
          <span className="truncate text-xs text-muted-foreground" title={entry.notes}>
            {entry.notes}
          </span>
        ) : null}
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
              <OperationRow key={item.key} operation={item.operation} at={item.at} />
            ) : (
              <BalanceRow key={item.key} entry={item.entry} />
            ),
          )}
        </div>
      </CardContent>
    </Card>
  );
}
