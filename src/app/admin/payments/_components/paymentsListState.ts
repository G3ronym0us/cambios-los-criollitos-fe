// Qué estado pinta PaymentsList, separado del JSX: así se puede probar la decisión (cargando,
// error, vacío por atención, vacío por filtro, vacío sin filtros, o la lista) sin montar
// componentes ni simular scroll infinito o la red.

import type { AttentionFilter } from '@/types/payment';

export type PaymentsListState =
  | 'loading'
  | 'error'
  | 'empty-attention'
  | 'empty-filtered'
  | 'empty-none'
  | 'list';

export interface PaymentsListStateInput {
  loading: boolean;
  error: string | null;
  paymentsCount: number;
  attention: AttentionFilter;
  hasActiveFilters: boolean;
}

/**
 * El orden de las comprobaciones es la prioridad real: mientras carga no importa si la
 * consulta anterior había fallado, y un error de red no es una bandeja vacía (los
 * comprobantes siguen ahí, solo falló la consulta). Recién sin error ni carga se mira si
 * la lista vino vacía, y ahí se distingue "no queda nada por atender" —un logro— de
 * "no hay resultados con estos filtros".
 */
export function getPaymentsListState({
  loading,
  error,
  paymentsCount,
  attention,
  hasActiveFilters,
}: PaymentsListStateInput): PaymentsListState {
  if (loading) return 'loading';
  if (error) return 'error';
  if (paymentsCount === 0) {
    if (attention === 'ATTENTION') return 'empty-attention';
    return hasActiveFilters ? 'empty-filtered' : 'empty-none';
  }
  return 'list';
}
