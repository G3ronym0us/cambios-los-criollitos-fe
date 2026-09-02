import type { AttentionFilter, PaymentStats } from '@/types/payment';

export type AttentionCounts = Record<AttentionFilter, number>;

/**
 * Las cifras entre paréntesis del segmentado «Por atender / Conciliados / Todos».
 *
 * En móvil el diseño quita la franja de atención —su número ya ES el filtro— y lo mete
 * dentro del propio segmentado. El backend no devuelve las tres cifras juntas: `stats`
 * trae las que esperan decisión y el listado trae el total del mismo ámbito (los mismos
 * filtros de búsqueda, fecha y clasificación, sin el segmento), así que «conciliados» es
 * la resta. Las dos peticiones llegan por separado y pueden cruzarse un instante: por eso
 * se recorta a `scopeTotal` en vez de dejar que la resta se vaya en negativo.
 */
export function getAttentionCounts(
  stats: PaymentStats | null,
  scopeTotal: number,
): AttentionCounts | null {
  if (!stats) return null;
  const attention = Math.min(Math.max(stats.needs_attention, 0), scopeTotal);
  return {
    ATTENTION: attention,
    RECONCILED: scopeTotal - attention,
    ALL: scopeTotal,
  };
}
