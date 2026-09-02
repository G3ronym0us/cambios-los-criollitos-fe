// Lógica pura del cajón "vincular pago" ↔ operación: qué se le pide al servidor y en qué
// orden se pintan las candidatas que responde. Aparte del componente para poder testearla sin
// montar React (ver linkOperationQuery.test.ts) y porque es la pieza que decide si el cajón
// vuelve a truncar el historial de un cliente — el bug que motivó esta corrección.

import type { OperationData, OperationFilters, OperationMatchScore } from '@/types/operation';
import type { PaymentTable } from '@/types/payment';

export type LinkScope = 'auto' | 'global';
export type LinkStatusView = 'active' | 'completed';
export type LinkSortMode = 'suggested' | 'amount' | 'time';

/**
 * Con cuántas operaciones de UN cliente hay que contar para no truncar nunca su historial.
 *
 * Medido en producción (2026-09-01, 1.730 operaciones, 76 clientes): mediana 3, p90 46, p95
 * 108, máximo observado 373. Esta consulta va scoped por `phone` en el servidor (no es un
 * lote global filtrado después), así que pedir el propio tope del backend (500 — el `le=500`
 * de `GET /operations`, `backend/app/routers/operations.py:70`) no le cuesta nada extra al
 * cliente típico —igual bajan sus 3 filas— y deja margen sobre el caso más pesado visto hasta
 * hoy sin tener que adivinar dónde cae el próximo cliente que se salga de la curva.
 */
export const CLIENT_SCOPE_LIMIT = 500;

/**
 * Grupos y "Ver todas" no se pueden acotar por teléfono en el servidor: un pago de grupo se
 * resuelve por membresía (`fund_group_uuid` / socio / cliente anónimo del grupo, ver `scoped`
 * en LinkOperationPanel.tsx) y "Ver todas" es, por definición, sin filtro de cliente. Siguen
 * pidiendo un lote global — mismo límite que usaba este cajón antes de esta corrección, sin
 * cambios — y el operador los acota a mano con el buscador o el estado.
 */
export const GLOBAL_SCOPE_LIMIT = 500;

export interface OperationQueryParams {
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
  table: PaymentTable;
  statusView: LinkStatusView;
}

/**
 * Arma los parámetros de `GET /operations` para el selector de "vincular pago".
 *
 * El filtrado por cliente, la búsqueda y (cuando el endpoint lo permite) el estado viajan
 * todos al servidor: el navegador ya no descarga un lote global de 500 operaciones de TODO el
 * sistema para recortarlo después en el `useMemo` — ese lote alcanzaba 8 días atrás y dejaba a
 * 22 de 76 clientes sin ni una operación visible al vincular su comprobante.
 */
export function buildOperationQuery(params: OperationQueryParams): OperationFilters {
  const { isGroup, scope, clientPhone, search, table, statusView } = params;
  const scopedToClient = scope === 'auto' && !isGroup;
  const filters: OperationFilters = {
    limit: scopedToClient ? CLIENT_SCOPE_LIMIT : GLOBAL_SCOPE_LIMIT,
  };
  if (scopedToClient && clientPhone) filters.phone = clientPhone;

  const trimmed = search.trim();
  if (trimmed) filters.search = trimmed;

  // "Completadas" es un solo estado y el endpoint ya sabe filtrarlo. "Activas" es
  // QUOTED-o-PENDING —el endpoint solo admite UN valor de `status`— así que esa mitad se
  // sigue acotando en el cliente (ver `availableByStatus` en LinkOperationPanel.tsx). No es
  // una regresión: es lo mismo que hacía el cajón antes de esta corrección, con la única
  // diferencia de que ahora parte de una lista completa y no de una truncada.
  if (table === 'outgoing' && statusView === 'completed') filters.status = 'COMPLETED';

  return filters;
}

/** Operación candidata junto a la puntuación que le dio el backend (si la tiene). */
export interface ScoredOperation {
  op: OperationData;
  score: OperationMatchScore | null;
}

const byCreatedAtDesc = (a: ScoredOperation, b: ScoredOperation) =>
  (b.op.created_at ?? '').localeCompare(a.op.created_at ?? '');

/**
 * Ordena las candidatas según el botón elegido ("sugerida" / "monto" / "hora").
 *
 * Sigue corriendo en el navegador —el endpoint `GET /operations` no sabe ordenar por
 * cercanía a un comprobante ni por la puntuación que calcula `POST /operations/match`, y
 * extender ese cálculo vive en el backend, fuera de lo que este cajón puede tocar— pero ya NO
 * es la causa de que se pierda una candidata: para el caso más común (cliente individual) la
 * lista que entra aquí es COMPLETA (ver `CLIENT_SCOPE_LIMIT`), así que ordenar y luego
 * recortar cuántas se pintan es seguro. Antes el recorte pasaba ANTES de bajar del servidor;
 * ahora el servidor ya entregó al cliente entero y el recorte es solo de pintado.
 */
export function sortScored(
  list: ScoredOperation[],
  sortMode: LinkSortMode,
  suggestionUuid: string | null,
): ScoredOperation[] {
  const sorted = [...list];
  if (sortMode === 'time') {
    sorted.sort(byCreatedAtDesc);
  } else if (sortMode === 'amount') {
    // Por cercanía al monto del comprobante; las que no se pueden comparar, al final.
    sorted.sort((a, b) => {
      const ra = a.score?.relative ?? Number.POSITIVE_INFINITY;
      const rb = b.score?.relative ?? Number.POSITIVE_INFINITY;
      return ra !== rb ? ra - rb : byCreatedAtDesc(a, b);
    });
  } else {
    // Sin puntuación (o si el backend falló) todas valen 0 y manda la recencia: el orden de
    // siempre, el que había antes de existir el scoring.
    sorted.sort((a, b) => (b.score?.score ?? 0) - (a.score?.score ?? 0) || byCreatedAtDesc(a, b));
    const i = suggestionUuid ? sorted.findIndex((s) => s.op.uuid === suggestionUuid) : -1;
    if (i > 0) sorted.unshift(...sorted.splice(i, 1));
  }
  return sorted;
}
