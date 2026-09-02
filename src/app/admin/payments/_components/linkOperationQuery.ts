// Lógica pura del cajón "vincular pago" ↔ operación: qué se le pide al servidor. Aparte del
// componente para poder testearla sin montar React (ver linkOperationQuery.test.ts) y porque es
// la pieza que decide si el cajón vuelve a truncar el historial de un cliente — el bug que
// motivó la primera corrección de este archivo.
//
// El orden y el corte YA NO son responsabilidad de esta función: `POST /operations/match`
// filtra, puntúa Y ordena (`order_by`) en un solo viaje, con paginación real (`page`/`limit`).
// Antes el cajón pedía `GET /operations` aparte y `POST /operations/match` para las
// puntuaciones, cruzaba por uuid, ordenaba en memoria (`sortScored`, ya no existe) y recortaba
// con `slice(0, 60)` — eso se fue con el backend. Lo único que queda aquí es armar el payload.

import type { OperationData, OperationMatchScore, OperationRankRequest } from '@/types/operation';
import type { PaymentTable } from '@/types/payment';

export type LinkScope = 'auto' | 'global';
export type LinkStatusView = 'active' | 'completed';
export type LinkSortMode = 'suggested' | 'amount' | 'time';

/**
 * Tamaño de página del cajón: cuántas candidatas trae cada viaje a `/operations/match`.
 *
 * El operador está en móvil a menudo, así que el primer viaje pesa poco (antes el corte visual
 * ya vivía en 60, vía `slice(0, 60)` sobre un lote de hasta 500 descargado entero) y "Cargar
 * más" pide la página siguiente sólo si hace falta — medido en producción (2026-09-01, 1.730
 * operaciones, 76 clientes): mediana 3, p90 46 candidatas por cliente, así que la enorme
 * mayoría no dispara una segunda página.
 */
export const MATCH_PAGE_LIMIT = 60;

export interface MatchQueryParams {
  paymentId: number;
  table: PaymentTable;
  isGroup: boolean;
  scope: LinkScope;
  /**
   * Teléfono ya resuelto del DUEÑO del comprobante — puede diferir de `payment.client_phone`
   * cuando el pago se transfirió a otro cliente (`paymentTransfer.ts`: la transferencia deja
   * el pago sin operación, así que el cajón tiene que buscar candidatas del nuevo dueño, no
   * de quien mandó el dinero). `null` cuando todavía no hay a quién acotar (grupo, o sin
   * cliente resuelto) — ahí no se manda `phone` y el alcance cae en el lote global.
   */
  clientPhone: string | null;
  search: string;
  statusView: LinkStatusView;
  sortMode: LinkSortMode;
  page: number;
}

/**
 * Arma el payload de `POST /operations/match` para el selector de "vincular pago".
 *
 * El filtrado por cliente, la búsqueda y (cuando el endpoint lo permite) el estado viajan
 * todos al servidor, igual que antes con `GET /operations` — el navegador no descarga un lote
 * global para recortarlo después. `order_by` es el botón de orden elegido: el servidor ya
 * entrega la lista lista para pintar, sugerida al frente en modo "suggested".
 */
export function buildMatchQuery(params: MatchQueryParams): OperationRankRequest {
  const { paymentId, table, isGroup, scope, clientPhone, search, statusView, sortMode, page } =
    params;
  const scopedToClient = scope === 'auto' && !isGroup;
  const payload: OperationRankRequest = {
    payment_id: paymentId,
    table,
    order_by: sortMode,
    page,
    limit: MATCH_PAGE_LIMIT,
  };
  if (scopedToClient && clientPhone) payload.phone = clientPhone;

  const trimmed = search.trim();
  if (trimmed) payload.search = trimmed;

  // "Completadas" es un solo estado y el endpoint ya sabe filtrarlo. "Activas" es
  // QUOTED-o-PENDING —el endpoint solo admite UN valor de `status`— así que esa mitad se
  // sigue acotando en el cliente (ver `availableByStatus` en LinkOperationPanel.tsx). No es
  // una regresión: es lo mismo que hacía el cajón antes de esta corrección.
  if (table === 'outgoing' && statusView === 'completed') payload.status = 'COMPLETED';

  return payload;
}

/** Operación candidata junto a la puntuación que le dio el backend (si la tiene). */
export interface ScoredOperation {
  op: OperationData;
  score: OperationMatchScore | null;
}
