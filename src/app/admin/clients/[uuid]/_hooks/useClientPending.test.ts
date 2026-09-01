import { describe, expect, it } from 'vitest';
import type { OperationData } from '@/types/operation';
import { blockedReason } from './useClientPending';

function op(overrides: Partial<OperationData> = {}): OperationData {
  return {
    uuid: 'op',
    status: 'PENDING',
    pending_amount: 100,
    settles_in_cash: false,
    beneficiary_alias: 'Yelitza',
    beneficiary_account_uuid: null,
    beneficiary_ambiguous: false,
    ...overrides,
  } as OperationData;
}

describe('blockedReason', () => {
  it('sin beneficiario no se entrega: no sabemos a quién', () => {
    expect(blockedReason(op({ beneficiary_alias: null }))).toBe(
      'Sin beneficiario: lo dirá el cliente',
    );
  });

  it('con la cuenta basta, aunque no haya alias', () => {
    expect(blockedReason(op({ beneficiary_alias: null, beneficiary_account_uuid: 'acc' }))).toBe(
      null,
    );
  });

  it('un nombre que apunta a varias cuentas tampoco sirve', () => {
    expect(blockedReason(op({ beneficiary_ambiguous: true }))).toBe(
      'Hay varias cuentas con ese nombre',
    );
  });

  describe('en un par de efectivo el beneficiario sobra', () => {
    // El gesto está invertido: los bolívares ya salieron y lo que se marca es que el CLIENTE
    // pagó. A quién se le entregó lo dice el comprobante saliente, que ya cuelga de la
    // operación. Exigirlo aquí tapaba el botón «Pagado» en 117 de las 120 filas de USD-VES.
    const efectivo = (o: Partial<OperationData> = {}) => op({ settles_in_cash: true, ...o });

    it('se puede marcar sin beneficiario', () => {
      expect(blockedReason(efectivo({ beneficiary_alias: null }))).toBe(null);
    });

    it('y tampoco lo traba que el nombre sea ambiguo', () => {
      expect(blockedReason(efectivo({ beneficiary_ambiguous: true }))).toBe(null);
    });
  });
});
