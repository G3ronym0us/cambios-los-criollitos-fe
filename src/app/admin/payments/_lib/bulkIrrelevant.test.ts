import { describe, expect, it } from 'vitest';
import type { PaymentData } from '@/types/payment';
import { canMarkIrrelevant, runInBatches } from './bulkIrrelevant';

function payment(overrides: Partial<PaymentData> = {}): PaymentData {
  return { id: 1, is_irrelevant: 0, loan: null, credited_to_balance: 0, ...overrides } as PaymentData;
}

describe('canMarkIrrelevant', () => {
  it('un pago normal entra en el lote', () => {
    expect(canMarkIrrelevant(payment())).toBe(true);
  });

  it('uno ya irrelevante no: no hay nada que cambiar', () => {
    expect(canMarkIrrelevant(payment({ is_irrelevant: 1 }))).toBe(false);
  });

  it('un préstamo no: ya es dinero del negocio', () => {
    expect(canMarkIrrelevant(payment({ loan: {} as PaymentData['loan'] }))).toBe(false);
  });

  it('uno acreditado al saldo tampoco', () => {
    expect(canMarkIrrelevant(payment({ credited_to_balance: 20 }))).toBe(false);
  });
});

describe('runInBatches', () => {
  it('sigue después de un fallo y separa los que entraron de los que no', async () => {
    const seen: number[] = [];
    const result = await runInBatches(
      [1, 2, 3, 4, 5],
      async (id) => {
        seen.push(id);
        return id === 2 ? { success: false, error: 'único comprobante' } : { success: true };
      },
      2,
    );
    expect(seen.sort()).toEqual([1, 2, 3, 4, 5]);
    expect(result.done).toEqual([1, 3, 4, 5]);
    expect(result.failed).toEqual([{ id: 2, error: 'único comprobante' }]);
  });
});
