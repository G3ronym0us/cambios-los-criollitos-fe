import type { ClientPendingByPair } from '@/types/client';
import type { OperationData } from '@/types/operation';

/**
 * «Por entregar»: la plata que le debemos al cliente.
 *
 * Es el trozo del valor de una operación que ningún comprobante de salida cubre todavía
 * —`pending_amount`—, que es justo lo que el listado de Operaciones llama «por cuadrar»
 * (`needs=settle`). Cuidado con el nombre: la tarjeta «por entregar» de esa pantalla es
 * OTRA cosa (`delivery_status`, el efectivo que falta mover en mano). Aquí, y en el
 * módulo de Clientes entero, «por entregar» = `pending_amount > 0` **y su dinero ya
 * entró**.
 *
 * ### En qué moneda
 *
 * `pending_amount` va en la moneda del VALOR del trato (`op.currency`, lo que entrega el
 * cliente: los USD de un USD/VES), no en la moneda con la que se le paga. Es la cifra
 * exacta y es la que se suma y se ordena. El equivalente en moneda de pago
 * (`payout_amount`) sale de multiplicar por la tasa cotizada: se muestra con «≈» y no se
 * agrega jamás, porque la tasa real la fijan los comprobantes.
 *
 * ### Sólo si su dinero ya entró
 *
 * Una operación sin comprobante entrante no es una deuda: es un trato apuntado del que
 * todavía no hemos recibido nada, y contarlo mezcla las dos patas del cambio —lo que él nos
 * manda y lo que nosotros le pagamos— en una sola cifra que no es ninguna de las dos. El
 * servidor aplica la misma regla en el agregado (`client_pending_service`, join a los
 * entrantes), así que la lista y el perfil dicen lo mismo.
 */

/** Pasados estos días la espera deja de ser ámbar y se pinta de rojo. */
export const PENDING_ALERT_DAYS = 3;

/** Debajo de esto es ruido de redondeo, no deuda. */
const EPSILON = 0.01;

/** ¿Ya nos entró el dinero de este trato? */
export function hasIncomingPayment(op: OperationData): boolean {
  return op.first_incoming_payment_at != null;
}

/**
 * ¿Esta operación tiene algo sin cubrir que de verdad haya que entregar?
 *
 * Es LA definición de la pantalla y tiene que decir exactamente lo mismo que
 * `ClientPendingService._pending_query` en el servidor, que es quien la calcula para el
 * listado: si divergen, la lista dice que se le debe a alguien y su perfil lo niega.
 *
 * Una `QUOTED` con el dinero adentro cuenta: que el operador no le haya movido el estado no
 * cambia que su plata llegó y no ha salido. Una `COMPLETED` no, aunque le falte cobertura —
 * está dada por cerrada, y lo que le falte es un descuadre que se arregla en la operación.
 */
export function isPendingOperation(op: OperationData): boolean {
  if (op.status !== 'PENDING' && op.status !== 'QUOTED') return false;
  if (!hasIncomingPayment(op)) return false;
  return (op.pending_amount ?? 0) > EPSILON;
}

/** La moneda en la que está expresado el valor —y por tanto `pending_amount`— de la op. */
export function valueCurrency(op: OperationData): string {
  return op.currency ?? op.from_currency ?? '';
}

/** La moneda con la que se le paga al cliente. */
export function payoutCurrency(op: OperationData): string | null {
  return op.to_currency;
}

/**
 * Lo pendiente de una op llevado a la moneda de pago.
 *
 * La conversión sale de la proporción del propio trato (`to_amount / from_amount`) y no de
 * `rate_used`: los dos montos ya vienen orientados, así que no hay que adivinar de qué
 * lado va la tasa ni leer `inverse_percentage`. `null` si la op no da para calcularlo —
 * mejor no enseñar número que enseñar uno inventado.
 */
export function payoutEquivalent(op: OperationData): number | null {
  const pending = op.pending_amount ?? 0;
  if (!op.from_amount || op.from_amount <= 0) return null;
  const converted = pending * (op.to_amount / op.from_amount);
  return Number.isFinite(converted) ? converted : null;
}

/**
 * Desde cuándo espera el cliente: la fecha de su PAGO, no la de la operación.
 *
 * Cuando el bot no reconoce un comprobante, el operador crea la operación a mano días
 * después (`POST /payments/{table}/{id}/create-operation`, que no lleva fecha). Su
 * `created_at` dice cuándo se registró el trato, no cuándo llegó el dinero: ordenar por ahí
 * manda las manuales al final de la cola aunque sean las más viejas. Y como el reparto va de
 * la más vieja a la más nueva, eso no es sólo un orden feo — es dinero aplicado a la
 * operación equivocada.
 *
 * Sin comprobante entrante se cae a la fecha de la operación, que para las que creó el bot
 * es la buena.
 */
export function pendingSince(op: OperationData): string | null {
  return op.first_incoming_payment_at ?? op.created_at ?? op.quoted_at ?? null;
}

function pairKey(op: OperationData): string {
  return op.pair_symbol ?? `${op.from_currency ?? '?'}/${op.to_currency ?? '?'}`;
}

function older(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() <= new Date(b).getTime() ? a : b;
}

/**
 * Agrupa por par las operaciones sin cubrir de UN cliente.
 * Ordena de mayor a menor deuda, que es el orden en que se lee.
 */
export function pendingByPair(operations: OperationData[]): ClientPendingByPair[] {
  const groups = new Map<string, ClientPendingByPair>();

  for (const op of operations) {
    if (!isPendingOperation(op)) continue;
    const key = pairKey(op);
    const amount = op.pending_amount ?? 0;
    const payout = payoutEquivalent(op);
    const current = groups.get(key);

    if (!current) {
      groups.set(key, {
        pair_symbol: key,
        currency: valueCurrency(op),
        amount,
        operations: 1,
        oldest_at: pendingSince(op),
        payout_currency: payoutCurrency(op),
        payout_amount: payout,
      });
      continue;
    }

    current.amount += amount;
    current.operations += 1;
    current.oldest_at = older(current.oldest_at, pendingSince(op));
    // Si a una sola op del grupo le falta la tasa, el equivalente del grupo entero deja de
    // ser cierto: se cae a null en vez de mostrar una suma incompleta.
    current.payout_amount =
      current.payout_amount == null || payout == null ? null : current.payout_amount + payout;
  }

  return [...groups.values()].sort((a, b) => b.amount - a.amount);
}

export interface PendingTotals {
  amount: number;
  operations: number;
  oldest_at: string | null;
  /** La moneda del total, o `null` si hay varias y por tanto no hay un total que valga. */
  currency: string | null;
  payout_currency: string | null;
  payout_amount: number | null;
}

/**
 * Suma varias entradas en un total. Monedas distintas NO se suman: el total se queda sin
 * moneda y quien lo pinte debe enseñar el desglose en vez de una cifra falsa.
 */
export function pendingTotals(entries: ClientPendingByPair[]): PendingTotals {
  const totals: PendingTotals = {
    amount: 0,
    operations: 0,
    oldest_at: null,
    currency: null,
    payout_currency: null,
    payout_amount: 0,
  };
  let mixed = false;
  let payoutMixed = false;

  for (const entry of entries) {
    totals.amount += entry.amount;
    totals.operations += entry.operations;
    totals.oldest_at = older(totals.oldest_at, entry.oldest_at);

    if (totals.currency == null) totals.currency = entry.currency;
    else if (totals.currency !== entry.currency) mixed = true;

    if (totals.payout_currency == null) totals.payout_currency = entry.payout_currency;
    else if (totals.payout_currency !== entry.payout_currency) payoutMixed = true;

    if (entry.payout_amount == null) totals.payout_amount = null;
    else if (totals.payout_amount != null) totals.payout_amount += entry.payout_amount;
  }

  if (mixed) totals.currency = null;
  if (payoutMixed || totals.currency == null) {
    totals.payout_currency = null;
    totals.payout_amount = null;
  }
  return totals;
}

/** Ámbar mientras la espera es normal, rojo cuando ya se pasó de `PENDING_ALERT_DAYS`. */
export function pendingTone(oldestAt: string | null, now: number = Date.now()): 'warning' | 'destructive' {
  if (!oldestAt) return 'warning';
  const then = new Date(oldestAt).getTime();
  if (!Number.isFinite(then)) return 'warning';
  return now - then > PENDING_ALERT_DAYS * 86_400_000 ? 'destructive' : 'warning';
}

/**
 * Cuánto lleva esperando, en el formato de la pantalla: "6 d 4 h", "9 h", "45 min".
 * Sin el "hace" de `formatRelativeTime`: aquí es una duración, no una fecha.
 */
export function waitedFor(oldestAt: string | null, now: number = Date.now()): string | null {
  if (!oldestAt) return null;
  const then = new Date(oldestAt).getTime();
  if (!Number.isFinite(then)) return null;

  const minutes = Math.max(0, Math.round((now - then) / 60_000));
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;

  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours ? `${days} d ${restHours} h` : `${days} d`;
}

/** Monto con dos decimales y su moneda, como se lee en toda la pantalla. */
export function formatPending(amount: number, currency: string | null): string {
  const value = amount.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${value} ${currency}` : value;
}

/**
 * La deuda agrupada por MONEDA, no por par: dos pares distintos pueden pagarse en la misma
 * moneda, y para enseñar cifras lo que manda es la moneda.
 */
export function totalsByCurrency(
  entries: ClientPendingByPair[],
): { currency: string; amount: number }[] {
  const byCurrency = new Map<string, number>();
  for (const entry of entries) {
    byCurrency.set(entry.currency, (byCurrency.get(entry.currency) ?? 0) + entry.amount);
  }
  return [...byCurrency.entries()]
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Lo que se debe, listo para pintar: `"1.513,33 USD"` con una sola moneda y
 * `"1.513,33 USD + 5.000,00 VES"` con varias.
 *
 * Existe porque el total de `pendingTotals` se queda sin moneda justo cuando hay más de
 * una, y pintarlo igual sería enseñar una suma de dólares con bolívares. Cualquier sitio que
 * enseñe una cifra de deuda debe pasar por aquí.
 */
export function formatPendingBreakdown(entries: ClientPendingByPair[]): string {
  const totals = totalsByCurrency(entries);
  if (totals.length === 0) return formatPending(0, null);
  return totals.map((total) => formatPending(total.amount, total.currency)).join(' + ');
}

/** Los pares presentes en un conjunto de deudas, para llenar el selector de par. */
export function pairsOf(pending: Iterable<ClientPendingByPair[]>): string[] {
  const symbols = new Set<string>();
  for (const entries of pending) for (const entry of entries) symbols.add(entry.pair_symbol);
  return [...symbols].sort((a, b) => a.localeCompare(b));
}
