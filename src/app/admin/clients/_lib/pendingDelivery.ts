import { operationService } from '@/services/operationService';
import type { OperationCoverage, UncoveredReason } from '@/types/operation';

/**
 * Marcar entregado, y deshacerlo.
 *
 * **Este archivo es el punto de sustitución.** El diseño pide tres endpoints que hoy no
 * existen: marcar un lote de operaciones, repartir un monto entre ellas, y deshacer con
 * rastro (quién marcó, cuándo, quién deshizo). Ver `docs/api/clients-pending.md`.
 *
 * Mientras tanto se resuelve con lo que ya hay, `PUT /operations/{uuid}/coverage`, que es
 * el mismo mecanismo que usa el panel de cobertura: entregar sin comprobante es declarar
 * el hueco como cubierto en efectivo (`uncovered.reason = 'CASH'`). Las consecuencias de
 * hacerlo así, y son reales:
 *
 * - **Una petición por operación**, más su lectura previa. Un lote de cinco son diez.
 * - **No es atómico.** Si la tercera falla, las dos primeras quedaron marcadas; por eso el
 *   resultado dice exactamente cuáles pasaron y cuáles no, en vez de un booleano.
 * - **El rastro es el del cuadre**, no el de una entrega: queda quién movió la cobertura,
 *   pero no la bitácora que pide el diseño.
 * - **Deshacer sólo vive en esta sesión.** Se puede porque antes de tocar nada se guarda
 *   la cobertura previa y se vuelve a poner; al recargar la página esa memoria se va, y
 *   entonces ya sólo se deshace desde el panel de cobertura de la operación.
 */

/** Lo que hay que recordar de una operación para poder devolverla a como estaba. */
export interface CoverageSnapshot {
  operationUuid: string;
  paymentIds: number[];
  /** Lo que faltaba por cubrir antes de tocarla; lo que se marcó como entregado. */
  pending: number;
  currency: string;
  /**
   * Lo que YA estaba declarado sin comprobante antes de esta entrega, y por qué.
   *
   * Se guarda porque `uncovered` no es un delta sino el hueco entero: para deshacer hay que
   * volver a poner exactamente este valor, no borrarlo — si no, deshacer la segunda entrega
   * parcial se llevaría por delante la primera.
   */
  uncovered: number;
  uncoveredReason: UncoveredReason | null;
}

export interface DeliveryOutcome {
  done: CoverageSnapshot[];
  failed: { operationUuid: string; error: string }[];
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function snapshot(operationUuid: string): Promise<CoverageSnapshot | string> {
  const result = await operationService.getCoverage(operationUuid);
  if (!result.success || !result.data) return result.error || 'No se pudo leer la cobertura';
  return toSnapshot(operationUuid, result.data);
}

function toSnapshot(operationUuid: string, coverage: OperationCoverage): CoverageSnapshot {
  return {
    operationUuid,
    paymentIds: coverage.settlements.map((settlement) => settlement.payment_id),
    pending: coverage.pending,
    currency: coverage.value_currency,
    uncovered: coverage.uncovered ?? 0,
    uncoveredReason: (coverage.uncovered_reason as UncoveredReason | null) ?? null,
  };
}

/**
 * Cierra el hueco de una operación declarándolo entregado en efectivo.
 *
 * `amount` permite entregar sólo una parte (el reparto de un monto): entonces la
 * operación se guarda como parcial y sigue debiendo el resto.
 */
export async function markDelivered(
  operationUuid: string,
  amount?: number,
): Promise<CoverageSnapshot | string> {
  const before = await snapshot(operationUuid);
  if (typeof before === 'string') return before;

  const settled = amount == null ? before.pending : Math.min(amount, before.pending);
  if (settled <= 0) return 'No queda nada por entregar en esta operación';

  const partial = settled < before.pending - 0.01;
  // `uncovered` es el hueco ENTERO declarado sin comprobante, no lo que se entrega ahora
  // (así lo manda el panel de cobertura). Una segunda entrega parcial tiene que sumarse a lo
  // que ya había: mandar sólo lo nuevo lo REEMPLAZA y la entrega anterior se pierde.
  const uncovered = round(before.uncovered + settled);
  const result = await operationService.setCoverage(operationUuid, {
    payments: before.paymentIds.map((payment_id) => ({ payment_id })),
    uncovered: { amount: uncovered, reason: 'CASH' },
    ...(partial ? { partial: true } : {}),
  });

  if (!result.success) return result.error || 'No se pudo marcar la entrega';
  return before;
}

/** Un lote, en orden y parando en seco no: lo que se pueda marcar, se marca. */
export async function markManyDelivered(operationUuids: string[]): Promise<DeliveryOutcome> {
  const outcome: DeliveryOutcome = { done: [], failed: [] };

  for (const operationUuid of operationUuids) {
    const result = await markDelivered(operationUuid);
    if (typeof result === 'string') outcome.failed.push({ operationUuid, error: result });
    else outcome.done.push(result);
  }

  return outcome;
}

/**
 * Devuelve la operación a como estaba: los mismos comprobantes y el mismo hueco declarado
 * que tenía ANTES de esta entrega — que puede no ser cero, si ya se le había entregado algo
 * sin comprobante. `partial: true` porque volver atrás es justamente dejarla sin cuadrar.
 */
export async function undoDelivery(before: CoverageSnapshot): Promise<string | null> {
  const result = await operationService.setCoverage(before.operationUuid, {
    payments: before.paymentIds.map((payment_id) => ({ payment_id })),
    ...(before.uncovered > 0
      ? { uncovered: { amount: before.uncovered, reason: before.uncoveredReason ?? 'CASH' } }
      : {}),
    partial: true,
  });
  return result.success ? null : result.error || 'No se pudo deshacer la entrega';
}

export async function undoMany(snapshots: CoverageSnapshot[]): Promise<DeliveryOutcome> {
  const outcome: DeliveryOutcome = { done: [], failed: [] };

  // Del revés: la última que se marcó es la primera que se deshace.
  for (const before of [...snapshots].reverse()) {
    const error = await undoDelivery(before);
    if (error) outcome.failed.push({ operationUuid: before.operationUuid, error });
    else outcome.done.push(before);
  }

  return outcome;
}
