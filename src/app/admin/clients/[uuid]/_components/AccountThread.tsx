'use client';

import Link from 'next/link';
import { ArrowDownCircle, ArrowUpCircle, Receipt } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';
import { formatCaracasShortDateTime } from '@/utils/functions';
import type { BalanceEntry } from '@/types/client';
import type { OperationData } from '@/types/operation';
import { STATE_LABEL, operationState, type AccountItem, type OperationState } from '../../_lib/account';
import { formatPending, payoutEquivalent, valueCurrency } from '../../_lib/pending';

interface AccountThreadProps {
  items: AccountItem[];
  emptyLabel: string;
}

const STATE_TONE: Record<OperationState, string> = {
  pending: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  delivered: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  quoted: 'border-border bg-muted text-muted-foreground',
  cancelled: 'border-border bg-muted text-muted-foreground',
};

function formatUsd(value: number) {
  return `$${value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Una operación en el hilo. Es una lectura, no una cola de trabajo: enseña el trato y en
 * qué estado quedó, y para actuar se entra en la operación o se filtra por «Por entregar».
 *
 * La fila ENTERA es el enlace a la operación, no sólo el uuid: es a donde se va desde aquí
 * —a ver los comprobantes, a cuadrarla—, y un blanco de ocho caracteres en móvil no es un
 * blanco. Por eso tampoco hay ningún otro enlace dentro; anidarlos no es válido.
 */
function OperationRow({ operation, at }: { operation: OperationData; at: string | null }) {
  const state = operationState(operation);
  const pending = operation.pending_amount ?? 0;
  const payout = payoutEquivalent(operation);

  return (
    <Link
      href={`/admin/operations/${operation.uuid}`}
      className="-mx-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-3 transition-colors hover:bg-muted"
    >
      <div className="min-w-0 flex-1 basis-56">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-xs text-muted-foreground">
            {operation.uuid.slice(0, 8)}
          </span>
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-[11px] font-medium',
              STATE_TONE[state],
            )}
          >
            {STATE_LABEL[state]}
          </span>
          {operation.pair_symbol ? (
            <span className="text-xs text-muted-foreground">{operation.pair_symbol}</span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-sm text-foreground">
          {operation.beneficiary_alias || (
            <span className="text-muted-foreground">Sin beneficiario</span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">{formatCaracasShortDateTime(at)}</p>
      </div>

      <div className="ml-auto shrink-0 text-right tabular-nums">
        <p className="text-sm font-semibold text-foreground">
          {formatPending(operation.from_amount, operation.from_currency)}
        </p>
        <p className="text-xs text-muted-foreground">
          → {formatPending(operation.to_amount, operation.to_currency)}
        </p>
        {state === 'pending' ? (
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            falta {formatPending(pending, valueCurrency(operation))}
            {payout != null && operation.to_currency ? (
              <span className="font-normal text-muted-foreground">
                {' '}
                (≈ {formatPending(payout, operation.to_currency)})
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

/** Un movimiento del saldo a favor. Mismo hilo, misma altura de lectura que una operación. */
function BalanceRow({ entry }: { entry: BalanceEntry }) {
  const isCredit = entry.entry_type === 'CREDIT';

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
      <span
        aria-hidden
        className={cn(
          'shrink-0',
          isCredit
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-amber-600 dark:text-amber-400',
        )}
      >
        {isCredit ? <ArrowDownCircle className="h-5 w-5" /> : <ArrowUpCircle className="h-5 w-5" />}
      </span>

      <div className="min-w-0 flex-1 basis-48">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:text-sky-400">
            Saldo
          </span>
          <span className="text-sm text-foreground">{isCredit ? 'Crédito' : 'Abono'}</span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {entry.incoming_payment_id != null ? `Pago entrante #${entry.incoming_payment_id} · ` : ''}
          {entry.operation_uuid ? `op ${entry.operation_uuid.slice(0, 8)} · ` : ''}
          {formatCaracasShortDateTime(entry.created_at)}
          {entry.created_by_username ? ` · ${entry.created_by_username}` : ''}
        </p>
        {/* A qué tasa se aplicó el saldo y cuántos bolívares pagó: esta es la única pantalla
            donde se puede ver, así que no puede perderse. */}
        {!isCredit && entry.operation_rate_used != null && entry.operation_to_amount != null ? (
          <p className="text-xs tabular-nums text-muted-foreground">
            @ {entry.operation_rate_used.toLocaleString('es-VE', { maximumFractionDigits: 4 })} →{' '}
            {entry.operation_to_amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
          </p>
        ) : null}
        {entry.notes ? <p className="text-xs text-muted-foreground">{entry.notes}</p> : null}
      </div>

      <span
        className={cn(
          'ml-auto shrink-0 text-sm font-semibold tabular-nums',
          isCredit
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-amber-600 dark:text-amber-400',
        )}
      >
        {isCredit ? '+' : '−'}
        {formatUsd(entry.amount)}
      </span>
    </div>
  );
}

export function AccountThread({ items, emptyLabel }: AccountThreadProps) {
  if (items.length === 0) {
    return <EmptyState icon={Receipt} title="Nada que mostrar" description={emptyLabel} />;
  }

  return (
    <Card>
      <CardContent className="divide-y divide-border p-4 sm:p-6">
        {items.map((item) =>
          item.kind === 'operation' ? (
            <OperationRow key={item.key} operation={item.operation} at={item.at} />
          ) : (
            <BalanceRow key={item.key} entry={item.entry} />
          ),
        )}
      </CardContent>
    </Card>
  );
}
