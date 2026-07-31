/**
 * Redondeo de cotizaciones — espejo de `apply_rounding` y
 * `WhatsAppQuoteService._apply_pair_rounding` en el backend, y de
 * `whatsapp-bot/src/calculator.ts`.
 *
 * Dos consumidores con exigencias distintas: la previsualización del admin
 * (que solo ilustra lo que hará el backend) y la calculadora pública, que SÍ
 * calcula de su lado lo que el cliente ve. Por eso `quotePair()` tiene que dar
 * exactamente el mismo número que el backend: si cambias la fórmula allá,
 * cámbiala aquí también.
 */

export type RoundingMode = 'RATE' | 'AMOUNT';
export type RoundingDirection = 'UP' | 'DOWN';
export type RoundingSide = 'FROM' | 'TO';
export type AmountSide = 'SEND' | 'RECEIVE';

/** Config de redondeo de un par, ya normalizada y validada. */
export interface PairRounding {
  mode: RoundingMode;
  step: number;
  direction: RoundingDirection;
  amountSide: RoundingSide | null;
}

export interface PairRoundingFields {
  rounding_mode?: string | null;
  rounding_step?: number | null;
  rounding_direction?: string | null;
  rounding_amount_side?: string | null;
}

export interface QuotedPair {
  fromAmount: number;
  toAmount: number;
  /** Tasa efectivamente aplicada: tras redondeo en modo RATE ya no es la del par. */
  rate: number;
  /** Cómo interpretar `rate`. El redondeo RATE la deja siempre en forma directa. */
  inverse: boolean;
}

/**
 * Normaliza los campos `rounding_*` que devuelve `/rates` a una config usable.
 * Devuelve null si el par no define redondeo o si la config está incompleta
 * (mismo criterio que el backend: sin step > 0 y sin dirección no se redondea).
 */
export function pairRoundingFrom(source: PairRoundingFields): PairRounding | null {
  const mode = source.rounding_mode;
  const step = source.rounding_step;
  const direction = source.rounding_direction;
  const side = source.rounding_amount_side;

  if (mode !== 'RATE' && mode !== 'AMOUNT') return null;
  if (!step || step <= 0) return null;
  if (direction !== 'UP' && direction !== 'DOWN') return null;

  const amountSide = side === 'FROM' || side === 'TO' ? side : null;
  // En modo AMOUNT el lado a redondear es obligatorio; sin él no hay nada que hacer.
  if (mode === 'AMOUNT' && amountSide === null) return null;

  return { mode, step, direction, amountSide };
}

/** Redondea `amount` al múltiplo `step`. Con step inválido devuelve el monto intacto. */
export function applyRounding(
  amount: number,
  step: number | null | undefined,
  direction: RoundingDirection | null | undefined
): number {
  if (!step || step <= 0) return amount;
  const q = amount / step;
  const eps = 1e-9;
  if (direction === 'UP') return Math.ceil(q - eps) * step;
  if (direction === 'DOWN') return Math.floor(q + eps) * step;
  return amount;
}

/** Tasa efectiva: unidades de `to` por 1 de `from`. */
export function effectiveRate(rate: number, inverse: boolean): number {
  return inverse ? 1 / rate : rate;
}

/** Convierte `amount` con la tasa del par, respetando el flag `inverse`. */
function applyRate(amount: number, rate: number, inverse: boolean): number {
  return inverse ? amount / rate : amount * rate;
}

/**
 * Cotiza un monto con la tasa del par y aplica el redondeo configurado.
 *
 * `side` dice qué lado escribió el usuario: 'SEND' fija el monto de origen y
 * calcula el destino; 'RECEIVE' hace lo inverso. El redondeo solo toca el lado
 * calculado, nunca el que el usuario escribió.
 *
 * Espejo de `whatsapp-bot/src/calculator.ts` y de
 * `WhatsAppQuoteService._apply_pair_rounding`.
 *
 * En modo AMOUNT, `amountSide` se interpreta en la dirección de ESTA cotización.
 * El backend lo resuelve contra las monedas canónicas del par, que es lo mismo
 * mientras la tasa se cotice en la orientación del par — hoy siempre: las 27
 * tasas activas de producción coinciden con la dirección de su par, y la
 * calculadora solo cotiza pares que encuentra por hit directo.
 */
export function quotePair(
  amount: number,
  rate: number,
  inverse: boolean,
  side: AmountSide,
  rounding: PairRounding | null
): QuotedPair {
  let fromAmount: number;
  let toAmount: number;

  if (side === 'SEND') {
    fromAmount = amount;
    toAmount = applyRate(amount, rate, inverse);
  } else {
    toAmount = amount;
    fromAmount = applyRate(amount, rate, !inverse); // se invierte el flag al ir al revés
  }

  let rateUsed = rate;
  let inverseUsed = inverse;

  if (rounding) {
    if (rounding.mode === 'RATE') {
      const rounded = applyRounding(
        effectiveRate(rate, inverse),
        rounding.step,
        rounding.direction
      );
      if (rounded > 0) {
        if (side === 'SEND') toAmount = fromAmount * rounded;
        else fromAmount = toAmount / rounded;
        // La tasa redondeada ya está en forma directa (`to` por 1 de `from`).
        rateUsed = rounded;
        inverseUsed = false;
      }
    } else if (rounding.amountSide) {
      if (side === 'SEND' && rounding.amountSide === 'TO') {
        toAmount = applyRounding(toAmount, rounding.step, rounding.direction);
      } else if (side === 'RECEIVE' && rounding.amountSide === 'FROM') {
        fromAmount = applyRounding(fromAmount, rounding.step, rounding.direction);
      }
    }
  }

  return { fromAmount, toAmount, rate: rateUsed, inverse: inverseUsed };
}

/** Formatea un número con hasta `maxDecimals` decimales, sin ceros de relleno. */
export function formatAmount(value: number, maxDecimals = 2): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('es-VE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

/**
 * Decimales razonables para mostrar una tasa según su magnitud: tasas grandes
 * (VES) se ven mejor con 2, tasas chicas (USDT→COP invertida) necesitan más.
 */
export function rateDecimals(rate: number): number {
  const abs = Math.abs(rate);
  if (!Number.isFinite(abs) || abs === 0) return 2;
  if (abs >= 100) return 2;
  if (abs >= 1) return 4;
  return 6;
}

/** Redondea hacia arriba a un "número bonito" (1/2/5 × 10^n) para montos de ejemplo. */
export function niceAmount(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 100;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}
