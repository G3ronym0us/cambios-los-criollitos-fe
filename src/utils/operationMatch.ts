// Puntuación de operaciones candidatas al vincular un comprobante, para que el operador vea
// arriba —y marcada— la que más se parece en monto y en hora.
//
// Espeja los criterios de `selectOperationForOutgoing` del bot
// (whatsapp-bot/src/operations.ts): mismo ±1% de tolerancia sobre el monto y misma idea de
// preferir lo reciente. La diferencia es el propósito: el bot necesita un match binario para
// vincular solo, aquí hace falta un ranking porque quien decide es el operador. No se importa
// el código del bot (son paquetes separados); si allá se mueve la tolerancia, moverla aquí.

import type { OperationData } from '@/types/operation';
import type { PaymentData, PaymentTable } from '@/types/payment';

/** Dentro de este margen el monto se considera "el mismo" — espejo del bot. */
export const AMOUNT_TOLERANCE = 0.01;
/** Más allá de esto el monto ya no compite por la sugerencia. */
const AMOUNT_CUTOFF = 0.02;
/** Horas a las que la cercanía temporal vale la mitad. */
const TIME_HALF_LIFE_HOURS = 6;
/** El monto manda; la hora solo desempata. */
const AMOUNT_WEIGHT = 0.75;
/** Ventaja mínima sobre la segunda candidata para dar la sugerencia por inequívoca. */
const SUGGESTION_MARGIN = 0.05;

/** ¿Hay con qué puntuar? Sin monto en el comprobante no hay nada que comparar. */
export function canScorePayment(payment: PaymentData): boolean {
  return payment.amount != null && Number.isFinite(payment.amount) && payment.amount > 0;
}

/**
 * Qué monto de la operación le toca comparar a este comprobante:
 *   outgoing → `to_amount` (lo que le pagamos al cliente)
 *   incoming → `from_amount` (lo que el cliente entrega)
 * Si la op ya está parcialmente cubierta, se prorratea el pendiente sobre ese lado: lo que falta
 * por pagar es del tamaño del resto, no del total.
 */
export function expectedAmountFor(
  op: OperationData,
  table: PaymentTable,
): { amount: number | null; currency: string | null } {
  if (table === 'incoming') {
    return { amount: op.from_amount ?? null, currency: op.from_currency };
  }
  const delivered = op.delivered_amount ?? 0;
  const pending = op.pending_amount ?? 0;
  const value = op.amount ?? op.from_amount ?? 0;
  if (delivered > 0.01 && pending > 0.01 && value > 0 && op.to_amount > 0) {
    return { amount: op.to_amount * (pending / value), currency: op.to_currency };
  }
  return { amount: op.to_amount ?? null, currency: op.to_currency };
}

export interface AmountDelta {
  /** Esperado − pagado, con signo (para pintar "+43" / "-7" en la fila). */
  delta: number;
  /** |delta| / pagado. */
  relative: number;
  currencyMatches: boolean;
}

export function amountDelta(
  op: OperationData,
  payment: PaymentData,
  table: PaymentTable,
): AmountDelta | null {
  const paid = payment.amount;
  if (paid == null || !Number.isFinite(paid) || paid <= 0) return null;
  const { amount, currency } = expectedAmountFor(op, table);
  if (amount == null || !Number.isFinite(amount)) return null;
  // Si a alguno de los dos lados le falta la moneda, no se castiga: el OCR no siempre la saca.
  const currencyMatches = !payment.currency || !currency || currency === payment.currency;
  const delta = amount - paid;
  return { delta, relative: Math.abs(delta) / paid, currencyMatches };
}

export interface OperationScore {
  delta: number | null;
  relative: number | null;
  currencyMatches: boolean;
  amountScore: number;
  timeScore: number;
  score: number;
  /** Calza en monto y moneda: puede optar a "Sugerida". */
  withinTolerance: boolean;
}

/** 1 si la op nació junto al comprobante, 0,5 a 6 h, ~0,2 a 24 h. Decae suave, sin cortes. */
function timeScoreFor(op: OperationData, payment: PaymentData, nowMs: number): number {
  const reference = payment.created_at ? new Date(payment.created_at).getTime() : nowMs;
  const created = op.created_at ? new Date(op.created_at).getTime() : Number.NaN;
  if (!Number.isFinite(created) || !Number.isFinite(reference)) return 0;
  const hours = Math.abs(reference - created) / 3_600_000;
  return 1 / (1 + hours / TIME_HALF_LIFE_HOURS);
}

export function scoreOperation(
  op: OperationData,
  payment: PaymentData,
  table: PaymentTable,
  nowMs: number,
): OperationScore {
  const diff = amountDelta(op, payment, table);
  const timeScore = timeScoreFor(op, payment, nowMs);
  // Moneda distinta o monto ausente: la op sigue listable y se puede elegir a mano, pero no
  // compite por la sugerencia.
  if (!diff || !diff.currencyMatches) {
    return {
      delta: diff?.delta ?? null,
      relative: diff?.relative ?? null,
      currencyMatches: diff?.currencyMatches ?? false,
      amountScore: 0,
      timeScore,
      score: 0,
      withinTolerance: false,
    };
  }
  const amountScore = Math.max(0, 1 - diff.relative / AMOUNT_CUTOFF);
  return {
    delta: diff.delta,
    relative: diff.relative,
    currencyMatches: true,
    amountScore,
    timeScore,
    score: amountScore > 0 ? AMOUNT_WEIGHT * amountScore + (1 - AMOUNT_WEIGHT) * timeScore : 0,
    withinTolerance: diff.relative <= AMOUNT_TOLERANCE,
  };
}

export interface Suggestion {
  uuid: string;
  /** Gana con claridad: se puede preseleccionar sin arriesgar un vínculo por inercia. */
  confident: boolean;
}

/**
 * La mejor candidata, si la hay. Solo optan las que calzan en monto; `confident` cae a false
 * cuando otra queda igual de cerca, para que en la duda el operador elija a mano.
 */
export function pickSuggestion<T extends { uuid: string; score: number; withinTolerance: boolean }>(
  scored: T[],
): Suggestion | null {
  const eligible = scored.filter((s) => s.withinTolerance).sort((a, b) => b.score - a.score);
  if (eligible.length === 0) return null;
  const [best, second] = eligible;
  return { uuid: best.uuid, confident: !second || best.score - second.score >= SUGGESTION_MARGIN };
}
