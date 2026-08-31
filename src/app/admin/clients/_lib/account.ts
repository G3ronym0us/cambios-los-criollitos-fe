import type { BalanceEntry } from '@/types/client';
import type { OperationData } from '@/types/operation';
import { isPendingOperation, pendingSince, type PaymentDates } from './pending';

/**
 * La pestaña «Cuenta»: Transacciones + Por entregar + Saldo en un solo hilo.
 *
 * Las tres eran la misma lista contada de tres maneras — las operaciones del cliente, las
 * que aún no le hemos cubierto, y los movimientos de su saldo a favor —, así que el tipo
 * deja de ser una pestaña y pasa a ser un filtro sobre un único hilo cronológico.
 *
 * Préstamos se queda fuera a propósito: vive en tres monedas a la vez, se revalúa a diario
 * y tiene abonos anidados. Como fila de una lista mixta no se lee.
 */

export type AccountFilter = 'all' | 'pending' | 'delivered' | 'balance';

/** Una línea del hilo: o una operación, o un movimiento del saldo. */
export type AccountItem =
  | { kind: 'operation'; key: string; at: string | null; operation: OperationData }
  | { kind: 'balance'; key: string; at: string | null; entry: BalanceEntry };

/** El estado de una operación dentro de la cuenta, con el vocabulario de esta pantalla. */
export type OperationState = 'pending' | 'delivered' | 'quoted' | 'cancelled';

export function operationState(op: OperationData): OperationState {
  if (op.status === 'CANCELLED') return 'cancelled';
  if (op.status === 'QUOTED') return 'quoted';
  return isPendingOperation(op) ? 'pending' : 'delivered';
}

export const STATE_LABEL: Record<OperationState, string> = {
  pending: 'Por entregar',
  delivered: 'Entregado',
  quoted: 'Cotizada',
  cancelled: 'Cancelada',
};

export interface AccountCounts {
  all: number;
  pending: number;
  delivered: number;
  balance: number;
}

export function accountCounts(
  operations: OperationData[],
  entries: BalanceEntry[],
): AccountCounts {
  const pending = operations.filter(isPendingOperation).length;
  return {
    all: operations.length + entries.length,
    pending,
    delivered: operations.length - pending,
    balance: entries.length,
  };
}

/**
 * Funde operaciones y movimientos de saldo en un hilo ordenado.
 *
 * `dates` es la fecha del comprobante de cada operación: la misma que ordena la lista de
 * «por entregar», para que una operación no salte de sitio al cambiar de filtro.
 *
 * El orden es del más nuevo al más viejo salvo en «Por entregar», que deja de ser un
 * histórico que se consulta y pasa a ser una cola de trabajo: ahí manda la antigüedad,
 * que es el orden en que el cliente reclama y en el que se reparte un monto.
 */
export function accountThread(
  operations: OperationData[],
  entries: BalanceEntry[],
  filter: AccountFilter,
  options: { pair?: string; dates?: PaymentDates } = {},
): AccountItem[] {
  const { pair, dates } = options;
  const items: AccountItem[] = [];

  if (filter !== 'balance') {
    for (const operation of operations) {
      if (pair && operation.pair_symbol !== pair) continue;
      const state = operationState(operation);
      if (filter === 'pending' && state !== 'pending') continue;
      if (filter === 'delivered' && state === 'pending') continue;
      items.push({
        kind: 'operation',
        key: `op:${operation.uuid}`,
        at: pendingSince(operation, dates),
        operation,
      });
    }
  }

  // Los movimientos de saldo no pertenecen a ningún par —el saldo a favor es un ledger en
  // USD—, así que con un par elegido no hay nada que enseñar de ellos.
  if ((filter === 'all' || filter === 'balance') && !pair) {
    for (const entry of entries) {
      items.push({ kind: 'balance', key: `bal:${entry.uuid}`, at: entry.created_at, entry });
    }
  }

  const oldestFirst = filter === 'pending';
  return items.sort((a, b) => {
    const left = a.at ? new Date(a.at).getTime() : null;
    const right = b.at ? new Date(b.at).getTime() : null;
    // Las que no traen fecha van al final, se ordene como se ordene.
    if (left == null) return right == null ? 0 : 1;
    if (right == null) return -1;
    return oldestFirst ? left - right : right - left;
  });
}

/** Los pares con actividad en la cuenta, para el selector. */
export function accountPairs(operations: OperationData[]): string[] {
  const symbols = new Set<string>();
  for (const operation of operations) {
    if (operation.pair_symbol) symbols.add(operation.pair_symbol);
  }
  return [...symbols].sort((a, b) => a.localeCompare(b));
}
