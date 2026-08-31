import type { RoundingSide } from '@/utils/rounding';

/**
 * Múltiplo de negociación — en qué cifras se habla con el cliente en un par.
 *
 * No lo confundas con `rounding_step`: aquel lo aplica el bot en CADA
 * cotización (ver `applyRounding` en `@/utils/rounding`), este no se aplica
 * solo. Únicamente alimenta las sugerencias de monto redondo al crear una
 * cotización a mano, para que ahí no haga falta un selector.
 *
 * Por eso pueden —y suelen— ser distintos: `VES/COP` redondea el monto a 100
 * COP pero se habla en pesos de 10.000.
 */

/**
 * Monto típico de una operación en la moneda del lado elegido, usado solo para
 * proponer atajos con el orden de magnitud correcto.
 *
 * Se toma una operación de referencia de 100 unidades de la moneda de origen:
 * si se negocia en la moneda de destino, esas 100 unidades valen `100 × rate`.
 * `null` cuando el par todavía no tiene tasa y no hay con qué estimar.
 */
export function negotiationReferenceAmount(
  rate: number | null | undefined,
  side: RoundingSide
): number | null {
  if (side === 'FROM') return 100;
  if (rate == null || !Number.isFinite(rate) || rate <= 0) return null;
  return 100 * rate;
}

/**
 * Dos atajos plausibles para ese monto de referencia: la década que lo contiene
 * y la siguiente. Con `VES/COP` a 16,8397 y negociando en COP la referencia son
 * 1.684 COP, así que salen 1.000 y 10.000 — las cifras en las que de hecho se
 * habla en ese par.
 */
export function suggestNegotiationSteps(reference: number | null): number[] {
  if (reference == null || !Number.isFinite(reference) || reference <= 0) return [];
  const decade = Math.pow(10, Math.floor(Math.log10(reference)));
  return [decade, decade * 10];
}

/** El múltiplo siempre es una cifra redonda: sin decimales salvo que sea menor que 1. */
export function formatNegotiationStep(value: number): string {
  return value.toLocaleString('es-VE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: value < 1 ? 4 : 0,
  });
}
