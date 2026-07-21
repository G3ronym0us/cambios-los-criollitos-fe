/**
 * Redondeo de cotizaciones — espejo de `apply_rounding` en
 * `backend/app/services/whatsapp_rate_resolver.py`.
 *
 * Se usa solo para PREVISUALIZAR en el admin lo que hará el backend; la
 * cotización real siempre la calcula el backend. Si cambias la fórmula allá,
 * cámbiala aquí también.
 */

export type RoundingMode = 'RATE' | 'AMOUNT';
export type RoundingDirection = 'UP' | 'DOWN';
export type RoundingSide = 'FROM' | 'TO';

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
