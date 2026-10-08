import type { PaymentData } from '@/types/payment';

/**
 * Si un pago puede entrar en un «marcar como irrelevantes» en lote.
 *
 * Fuera quedan los que el backend rechazaría seguro: los ya irrelevantes (no hay nada que
 * cambiar), los registrados como préstamo y los acreditados al saldo del cliente (los dos
 * ya cuentan como dinero del negocio). El único rechazo que no se ve desde aquí es el de un
 * pago que es el ÚNICO comprobante de su operación: ahí hay que decidir qué pasa con la
 * operación, y esa pregunta se contesta pago a pago, no en lote.
 */
export function canMarkIrrelevant(payment: PaymentData): boolean {
  if (payment.is_irrelevant) return false;
  if (payment.loan) return false;
  if ((payment.credited_to_balance ?? 0) > 0) return false;
  return true;
}

export interface BulkFailure {
  id: number;
  error: string;
}

/**
 * Corre `task` sobre cada id, de `concurrency` en `concurrency`, y separa los que entraron de
 * los que no. No se para en el primer fallo: cada pago es independiente, y que uno sea el
 * único comprobante de su operación no es motivo para no marcar los otros diecinueve.
 */
export async function runInBatches(
  ids: number[],
  task: (id: number) => Promise<{ success: boolean; error?: string }>,
  concurrency = 4,
): Promise<{ done: number[]; failed: BulkFailure[] }> {
  const done: number[] = [];
  const failed: BulkFailure[] = [];
  for (let i = 0; i < ids.length; i += concurrency) {
    const chunk = ids.slice(i, i + concurrency);
    const results = await Promise.all(chunk.map((id) => task(id)));
    results.forEach((result, index) => {
      const id = chunk[index];
      if (result.success) done.push(id);
      else failed.push({ id, error: result.error || 'Error desconocido' });
    });
  }
  return { done, failed };
}
