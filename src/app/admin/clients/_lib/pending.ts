import type { ClientPendingByPair } from '@/types/client';
import type { OperationData } from '@/types/operation';

/**
 * «Por entregar»: la plata que le debemos al cliente.
 *
 * Es el trozo del valor de una operación que ningún comprobante de salida cubre todavía
 * —`pending_amount`—, que es justo lo que el listado de Operaciones llama «por cuadrar»
 * (`needs=settle`). Cuidado con el nombre: la tarjeta «por entregar» de esa pantalla es
 * OTRA cosa (`delivery_status`, el efectivo que falta mover en mano). Aquí, y en el
 * módulo de Clientes entero, «por entregar» = `pending_amount > 0`.
 *
 * ### En qué moneda
 *
 * `pending_amount` va en la moneda del VALOR del trato (`op.currency`, lo que entrega el
 * cliente: los USD de un USD/VES), no en la moneda con la que se le paga. Es la cifra
 * exacta y es la que se suma y se ordena. El equivalente en moneda de pago
 * (`payout_amount`) sale de multiplicar por la tasa cotizada: se muestra con «≈» y no se
 * agrega jamás, porque la tasa real la fijan los comprobantes.
 *
 * ### De dónde salen los datos
 *
 * El agregado por par lo resuelve el servidor (`ClientPendingService`) y llega en
 * `pending_by_pair`, tanto en el listado como en la ficha: eso es lo que pinta el
 * directorio, sin techos ni totales que se queden cortos. Lo de aquí es lo que hace falta
 * cuando se trabaja OPERACIÓN A OPERACIÓN —la cola de entregas del perfil—, donde hay que
 * saber de cada fila cuánto falta y desde cuándo espera.
 */

/** Pasados estos días la espera deja de ser ámbar y se pinta de rojo. */
export const PENDING_ALERT_DAYS = 3;

/** Debajo de esto es ruido de redondeo, no deuda. */
const EPSILON = 0.01;

/**
 * ¿Esta operación tiene algo sin cubrir que de verdad haya que entregar?
 *
 * Son DOS condiciones, no una. `pending_amount` sale de los comprobantes de SALIDA: mide
 * lo que no le hemos pagado. Pero no le debemos nada hasta que su plata llega — una
 * operación registrada sin comprobante entrante es una cotización o un trato a medio
 * armar, y ahí el que debe es él, no nosotros. Contar sólo `pending_amount` mezclaba las
 * dos patas del cambio y ponía bajo «Le debemos» operaciones que nadie había pagado.
 *
 * **En los pares que se cambian en efectivo** (`settles_in_cash`) la pregunta es la
 * contraria y por eso se mide otra columna. Ahí los bolívares ya salieron y lo que falta es
 * el efectivo del CLIENTE: `to_collect`, el valor menos lo que ya se le recogió. Mirar
 * `pending_amount` sacaba de la lista justo lo que hay que ir a cobrar — una operación
 * creada desde su propio comprobante en bolívares nace cubierta, así que salía el mismo día
 * en que empezaba a deberse. El comprobante entrante tampoco filtra: no hay ni habrá, nadie
 * fotografía un billete.
 *
 * Es la misma regla que aplica el backend en `ClientPendingService` para el agregado que
 * ya consume la lista de clientes; vive aquí para que el perfil no diga otra cosa que la
 * lista sobre el mismo cliente.
 */
export function isPendingOperation(op: OperationData): boolean {
  if (op.status === 'CANCELLED' || op.status === 'QUOTED') return false;
  if (op.settles_in_cash) return outstandingAmount(op) > EPSILON;
  if (!op.first_incoming_payment_at) return false;
  return outstandingAmount(op) > EPSILON;
}

/**
 * Lo que falta de esta operación, en la moneda del valor — y de qué lado está.
 *
 * En un par normal es lo que NOSOTROS no hemos cubierto (`pending_amount`); en uno de
 * efectivo, lo que el CLIENTE no ha traído (`to_collect`). Las dos cifras existen a la vez
 * en la misma operación y no significan lo mismo, así que toda la pantalla —la cola, el
 * reparto, el hilo, los totales— tiene que pasar por aquí para no leer la columna del otro
 * lado. Es lo que hacía que una USD-VES ya pagada en bolívares saliera como saldada.
 */
export function outstandingAmount(op: OperationData): number {
  if (op.settles_in_cash) return op.to_collect ?? 0;
  return op.pending_amount ?? 0;
}

/**
 * ¿Lo que falta en estas deudas es nuestro o del cliente?
 *
 * En un par normal el pendiente es lo que le debemos: su dinero entró y los bolívares no
 * han salido. En un par de efectivo es al revés — los bolívares ya salieron y lo que falta
 * es el efectivo del cliente. La misma cifra, el rótulo opuesto, así que la pantalla no
 * puede llamarlas igual.
 *
 * `true` sólo si TODO lo que se está sumando es de pares de efectivo: con una mezcla no hay
 * un rótulo que sea cierto para las dos, y se cae al neutro.
 */
export function isCashDebt(entries: ClientPendingByPair[]): boolean {
  return entries.length > 0 && entries.every((entry) => entry.settles_in_cash);
}

/** La moneda en la que está expresado el valor —y por tanto `pending_amount`— de la op. */
export function valueCurrency(op: OperationData): string {
  return op.currency ?? op.from_currency ?? '';
}

/**
 * Cuánto de la operación está ya cubierto, venga de donde venga.
 *
 * Son DOS cosas y hay que sumarlas: lo que cubren comprobantes de salida
 * (`delivered_amount`) y lo que se declaró entregado o cobrado en efectivo, sin comprobante
 * (`uncovered_amount`). El backend descuenta las dos de `pending_amount`, pero sólo la
 * primera viaja como «entregado».
 *
 * Mirar sólo `delivered_amount` fue un fallo real: al repartir 240 y colocar 40 en una
 * operación de 75, la fila pasaba a enseñar «75,00» tachado… no, peor: enseñaba 35,00 a
 * secas, como si el trato hubiera sido de 35 desde el principio. Los 40 no aparecían en
 * ningún sitio de la pantalla.
 */
export function coveredAmount(op: OperationData): number {
  // En efectivo la parte «ya resuelta» de la fila es lo que el cliente ya trajo: sumar ahí
  // los comprobantes de salida daba el valor entero —los bolívares ya salieron— y pintaba
  // como saldada una operación de la que no se ha recogido nada.
  if (op.settles_in_cash) return op.collected_amount ?? 0;
  return (op.delivered_amount ?? 0) + (op.uncovered_amount ?? 0);
}

/**
 * El valor del trato en la moneda del valor: lo ya cubierto más lo que falta.
 *
 * Se prefiere `amount` porque es el dato del trato; la suma es el respaldo para las
 * operaciones viejas que no lo traen.
 */
export function valueAmount(op: OperationData): number {
  if (op.amount != null) return op.amount;
  return coveredAmount(op) + outstandingAmount(op);
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
  const pending = outstandingAmount(op);
  if (!op.from_amount || op.from_amount <= 0) return null;
  const converted = pending * (op.to_amount / op.from_amount);
  return Number.isFinite(converted) ? converted : null;
}

/**
 * Desde cuándo espera el cliente: la fecha del PAGO, no la de la operación.
 *
 * Cuando el bot no reconoce un comprobante, el operador crea la operación a mano días
 * después (`POST /payments/{table}/{id}/create-operation`, que no lleva fecha). Su
 * `created_at` dice cuándo se registró el trato, no cuándo llegó el dinero: ordenar por ahí
 * manda las manuales al final de la cola aunque sean las más viejas. Y como el reparto va de
 * la más vieja a la más nueva, eso no es sólo un orden feo — es dinero aplicado a la
 * operación equivocada.
 *
 * El respaldo a la fecha de la operación es para las ya entregadas, que se enseñan en el
 * hilo sin tener entrante: en la cola de «por entregar» no hace falta, porque sin entrante
 * no entran (ver `isPendingOperation`).
 */
export function pendingSince(op: OperationData): string | null {
  return op.first_incoming_payment_at ?? op.created_at ?? op.quoted_at ?? null;
}

/**
 * Cuándo se pagó el trato, para ENSEÑAR en una fila: la fecha del comprobante entrante MÁS
 * RECIENTE, no la del primero.
 *
 * A propósito NO es `pendingSince`, aunque las dos se calculen sobre los mismos
 * comprobantes. `pendingSince` mide antigüedad —desde cuándo espera la operación, con el
 * PRIMER pago— y de ahí sale el orden de la cola de «por entregar» y el reparto por
 * antigüedad: eso no puede cambiar aunque lleguen más pagos después, o un abono nuevo
 * "rejuvenecería" una deuda vieja. Esta función es lo contrario: cuánto hace que pasó el
 * ÚLTIMO hecho — si el cliente pagó en dos partes, la fecha que tiene sentido enseñar en el
 * hilo es la del último abono, no la del primero. Una operación con dos comprobantes
 * necesita las dos fechas a la vez, así que no se pueden fundir en una sola función sin
 * perder una de las dos.
 *
 * Mismo respaldo que `pendingSince` cuando no hay ningún entrante (`VIA_PARTNER` sin
 * comprobante propio, o un par `settles_in_cash`): la fecha de la operación es lo mejor que
 * hay.
 */
export function lastPaymentAt(op: OperationData): string | null {
  return op.last_incoming_payment_at ?? op.created_at ?? op.quoted_at ?? null;
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
    const amount = outstandingAmount(op);
    const payout = payoutEquivalent(op);
    const current = groups.get(key);

    if (!current) {
      groups.set(key, {
        pair_symbol: key,
        // Se normaliza a booleano: el campo es obligatorio en la entrada y una operación
        // vieja que llegue sin él es un par normal, no un `undefined` que se propague.
        settles_in_cash: op.settles_in_cash ?? false,
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
