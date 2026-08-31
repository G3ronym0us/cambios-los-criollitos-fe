import { operationService } from '@/services/operationService';
import type { PaymentDates } from './pending';

/**
 * Desde cuándo espera de verdad cada operación: la fecha de su comprobante ENTRANTE.
 *
 * El caso que resuelve: cuando el bot no reconoce un comprobante, el operador crea la
 * operación a mano desde el pago (`POST /payments/{table}/{id}/create-operation`), que no
 * lleva fecha. La operación nace con `created_at` de hoy aunque el dinero llegara la semana
 * pasada, así que ordenar por la operación pone las manuales al final de la cola — y el
 * reparto, que va de la más vieja a la más nueva, aplicaría el dinero a la operación
 * equivocada.
 *
 * El entrante y no el saliente: lo que arranca el reloj es que el cliente pagó, no que
 * nosotros entregáramos algo. Si una operación tiene varios, manda el primero.
 *
 * **Cuesta una petición por operación.** Se llama sólo con las operaciones sin cubrir de UN
 * cliente —que son pocas, para eso está la pantalla—, nunca con la lista entera. Lo que
 * debería existir es la fecha en la propia operación; está pedido en
 * `docs/api/clients-pending.md`.
 */
export async function loadPaymentDates(operationUuids: string[]): Promise<PaymentDates> {
  const entries = await Promise.all(
    operationUuids.map(async (uuid): Promise<[string, string | null]> => {
      const result = await operationService.getOperationPayments(uuid);
      if (!result.success || !result.data) return [uuid, null];

      const dates = result.data.incoming
        .map((payment) => payment.created_at)
        .filter((date): date is string => !!date);
      if (dates.length === 0) return [uuid, null];

      const earliest = dates.reduce((oldest, date) =>
        new Date(date).getTime() < new Date(oldest).getTime() ? date : oldest,
      );
      return [uuid, earliest];
    }),
  );

  return new Map(entries);
}
