import type { BalanceEntry } from '@/types/client';
import type { OperationData } from '@/types/operation';
import { hasIncomingPayment, isPendingOperation, pendingSince } from './pending';

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

/**
 * Se pregunta primero si se debe y después por el estado: una cotización que el cliente ya
 * pagó es deuda, se llame como se llame en la base. Al revés, saldría «Cotizada» encima de
 * una plata que hay que entregar hoy.
 */
export function operationState(op: OperationData): OperationState {
  if (isPendingOperation(op)) return 'pending';
  if (op.status === 'CANCELLED') return 'cancelled';
  if (op.status === 'QUOTED') return 'quoted';
  return 'delivered';
}

/**
 * ¿Esta operación es un movimiento de la cuenta del cliente?
 *
 * Una cuenta son movimientos de dinero, no el registro de todo lo que se habló. Se quedan
 * fuera:
 *
 * - Las que **no tienen ningún comprobante** y tampoco están completadas: un trato apuntado
 *   —o una cotización que caducó— del que no ha entrado ni salido plata. Se ven en
 *   Operaciones, que es donde se trabajan; aquí sólo hacían bulto y hacían parecer que se le
 *   debía algo que no se le debe.
 * - Las **canceladas**: si movieron algo, se devolvió, y la devolución es su propio
 *   movimiento.
 *
 * `COMPLETED` entra aunque no se le vea comprobante: lo dio por cerrado un operador, y de
 * las viejas migradas de SQLite muchas no traen comprobante ninguno.
 */
export function isAccountMovement(op: OperationData): boolean {
  if (op.status === 'CANCELLED') return false;
  if (op.status === 'COMPLETED') return true;
  return hasIncomingPayment(op) || op.last_outgoing_payment_at != null;
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

/**
 * Los números de los chips.
 *
 * Cuentan exactamente lo que cada chip va a enseñar, `pair` incluido: un chip que dice 4 y
 * abre una lista de 1 es peor que no tener número. «Saldo» es la excepción y no se acota,
 * porque su filtro tampoco mira el par (ver `accountThread`).
 */
export function accountCounts(
  operations: OperationData[],
  entries: BalanceEntry[],
  pair?: string,
): AccountCounts {
  const movements = operations.filter(isAccountMovement);
  const scoped = pair ? movements.filter((op) => op.pair_symbol === pair) : movements;
  const pending = scoped.filter(isPendingOperation).length;
  return {
    all: scoped.length + (pair ? 0 : entries.length),
    pending,
    delivered: scoped.length - pending,
    balance: entries.length,
  };
}

/**
 * Cuándo pasó, para situar la operación en el hilo.
 *
 * Mientras se debe, la fecha que importa es la de ENTRADA: es desde cuándo espera el
 * cliente, la misma por la que ordena la cola de «por entregar», así que la fila no salta
 * de sitio al cambiar de filtro. Una vez entregada, el movimiento terminó cuando salió el
 * dinero, y esa es la fecha que el operador busca — dejarla en la de entrada la hunde en el
 * hilo semanas por debajo de cosas que pasaron antes.
 */
export function accountDate(op: OperationData): string | null {
  if (isPendingOperation(op)) return pendingSince(op);
  return op.last_outgoing_payment_at ?? op.completed_at ?? pendingSince(op);
}

/**
 * Funde operaciones y movimientos de saldo en un hilo ordenado.
 *
 * El orden es del más nuevo al más viejo salvo en «Por entregar», que deja de ser un
 * histórico que se consulta y pasa a ser una cola de trabajo: ahí manda la antigüedad,
 * que es el orden en que el cliente reclama y en el que se reparte un monto.
 */
export function accountThread(
  operations: OperationData[],
  entries: BalanceEntry[],
  filter: AccountFilter,
  options: { pair?: string } = {},
): AccountItem[] {
  // En «Saldo» el par no pinta nada —el saldo a favor es un ledger en USD, no es de ningún
  // par— y además su selector ni se enseña: hacerle caso dejaría la lista vacía sin manera
  // visible de arreglarlo.
  const pair = filter === 'balance' ? '' : options.pair;
  const items: AccountItem[] = [];

  if (filter !== 'balance') {
    for (const operation of operations) {
      if (!isAccountMovement(operation)) continue;
      if (pair && operation.pair_symbol !== pair) continue;
      const state = operationState(operation);
      if (filter === 'pending' && state !== 'pending') continue;
      if (filter === 'delivered' && state === 'pending') continue;
      items.push({
        kind: 'operation',
        key: `op:${operation.uuid}`,
        at: accountDate(operation),
        operation,
      });
    }
  }

  // En «Todo» con un par elegido los movimientos de saldo no encajan y se quedan fuera; en
  // «Saldo» el par ya se ha ignorado arriba, así que siempre salen.
  if ((filter === 'all' && !pair) || filter === 'balance') {
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

/**
 * Los pares con actividad en la cuenta, para el selector. Sólo los que de verdad tienen
 * movimientos: un par cuya única operación es una cotización daría un chip que abre vacío.
 */
export function accountPairs(operations: OperationData[]): string[] {
  const symbols = new Set<string>();
  for (const operation of operations) {
    if (operation.pair_symbol && isAccountMovement(operation)) symbols.add(operation.pair_symbol);
  }
  return [...symbols].sort((a, b) => a.localeCompare(b));
}
