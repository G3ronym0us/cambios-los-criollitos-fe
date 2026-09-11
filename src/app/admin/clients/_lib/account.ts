import type { BalanceEntry } from '@/types/client';
import type { OperationData } from '@/types/operation';
import { isPendingOperation, lastPaymentAt, pendingSince } from './pending';

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

/**
 * Una línea del hilo: o una operación, o un movimiento del saldo.
 *
 * Una operación lleva DOS fechas y no una porque miden cosas distintas: `at` es la
 * antigüedad (primer pago) que usa la cola de «por entregar» para ordenar y repartir, y
 * `displayAt` es la fecha que la fila ENSEÑA (el pago más reciente). Un movimiento de saldo
 * no tiene esa dualidad — `entry.created_at` es a la vez lo uno y lo otro — así que sólo
 * lleva `at`.
 */
export type AccountItem =
  | {
      kind: 'operation';
      key: string;
      at: string | null;
      displayAt: string | null;
      operation: OperationData;
    }
  | { kind: 'balance'; key: string; at: string | null; entry: BalanceEntry };

/** El estado de una operación dentro de la cuenta, con el vocabulario de esta pantalla. */
export type OperationState = 'pending' | 'open' | 'delivered' | 'quoted' | 'cancelled';

/**
 * En qué estado está la operación para esta pantalla.
 *
 * Son DOS preguntas distintas y hay que hacer las dos, porque no siempre responden igual:
 *
 * 1. ¿Está en la cola de trabajo? — `isPendingOperation`, que mide lo que falta por cubrir
 *    (`pending_amount`) y es la misma regla que aplica el backend al agregado por cliente.
 * 2. ¿Está cerrada? — `status`, que es lo único que dice si la operación terminó.
 *
 * Contestar sólo la primera —«no hay nada por cubrir, luego está entregada»— era el bug:
 * una USD-VES nacida de su comprobante de salida se crea CUBIERTA y en PENDING a la vez
 * (`create_operation_from_payment` sólo la completa si la moneda que entrega el cliente no
 * es USD efectivo; los billetes se reciben después, con `receive_delivery`). El hilo la
 * rotulaba «Completado · Cobrada» mientras la bandeja de Pagos, que lee `status`, la
 * rotulaba «Pendiente» — el mismo trato con dos estados opuestos en dos pantallas.
 *
 * `open` es justo ese hueco: fuera de la cola —no le debemos nada— pero sin cerrar. Se
 * rotula «Pendiente», la misma palabra que usan Pagos y el listado de Operaciones para
 * `status = PENDING`, que es de donde sale.
 */
export function operationState(op: OperationData): OperationState {
  if (op.status === 'CANCELLED') return 'cancelled';
  if (op.status === 'QUOTED') return 'quoted';
  if (isPendingOperation(op)) return 'pending';
  return op.status === 'COMPLETED' ? 'delivered' : 'open';
}

export const STATE_LABEL: Record<OperationState, string> = {
  pending: 'Por entregar',
  open: 'Pendiente',
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
  const scoped = pair ? operations.filter((op) => op.pair_symbol === pair) : operations;
  const pending = scoped.filter(isPendingOperation).length;
  return {
    all: scoped.length + (pair ? 0 : entries.length),
    pending,
    delivered: scoped.length - pending,
    balance: entries.length,
  };
}

/**
 * Funde operaciones y movimientos de saldo en un hilo ordenado.
 *
 * El orden es del más nuevo al más viejo salvo en «Por entregar», que deja de ser un
 * histórico que se consulta y pasa a ser una cola de trabajo: ahí manda la antigüedad
 * (`pendingSince`, el PRIMER pago), que es el orden en que el cliente reclama y en el que
 * se reparte un monto — un abono nuevo no puede «rejuvenecer» una deuda vieja ni saltarla
 * en la cola.
 *
 * En el resto de vistas («todo», «entregado», «saldo») el hilo es lectura, no cola de
 * trabajo, y ahí se ordena por la MISMA fecha que cada fila enseña — el pago más reciente
 * (`lastPaymentAt`) en las operaciones. Ordenar por una fecha y enseñar otra en la misma
 * fila confunde a quien lee la lista; es una elección deliberada y distinta de «por
 * entregar», no una inconsistencia.
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
      if (pair && operation.pair_symbol !== pair) continue;
      const state = operationState(operation);
      if (filter === 'pending' && state !== 'pending') continue;
      if (filter === 'delivered' && state === 'pending') continue;
      items.push({
        kind: 'operation',
        key: `op:${operation.uuid}`,
        at: pendingSince(operation),
        displayAt: lastPaymentAt(operation),
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
  // «Por entregar» ordena por antigüedad (`at`, primer pago); el resto ordena por lo que
  // la fila enseña — `displayAt` en una operación, que en un movimiento de saldo es el
  // mismo `at` (no hay dos fechas que fundir ahí).
  const sortValue = (item: AccountItem): string | null =>
    oldestFirst || item.kind === 'balance' ? item.at : item.displayAt;

  return items.sort((a, b) => {
    const aValue = sortValue(a);
    const bValue = sortValue(b);
    const left = aValue ? new Date(aValue).getTime() : null;
    const right = bValue ? new Date(bValue).getTime() : null;
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
