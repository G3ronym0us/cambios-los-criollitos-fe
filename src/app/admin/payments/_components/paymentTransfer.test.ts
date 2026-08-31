import { describe, expect, it } from 'vitest';
import { Role } from '@/utils/enums';
import type { PaymentData } from '@/types/payment';
import {
  canTransferPayment,
  canTransferPayments,
  sharesSurname,
  transferBlockingField,
  transferReasonLabel,
  transferUnlinksOperation,
} from './paymentTransfer';

// Un entrante recién leído por el bot: sin vincular, sin depósito y sin saldo acreditado.
function payment(overrides: Partial<PaymentData> = {}): PaymentData {
  return {
    id: 4821,
    uuid: 'p-4821',
    client_phone: '584148829041@c.us',
    client_name: 'Yeimar A. Rondón',
    client_uuid: 'c-yeimar',
    provider: 'ZELLE',
    amount: 220,
    currency: 'USD',
    bank_from: 'Bank of America',
    bank_to: null,
    account_number: null,
    identification: null,
    phone_to: null,
    reference: '004821',
    raw_text: null,
    operation_uuid: null,
    corrected_at: null,
    correction_original: null,
    created_at: '2026-08-31T14:42:00Z',
    ...overrides,
  };
}

describe('canTransferPayments (rol del operador)', () => {
  it('solo ROOT transfiere', () => {
    expect(canTransferPayments(Role.ROOT)).toBe(true);
    // MODERATOR entra a /admin, así que gatearlo ahí sería no gatearlo.
    expect(canTransferPayments(Role.MODERATOR)).toBe(false);
    expect(canTransferPayments(Role.USER)).toBe(false);
    expect(canTransferPayments(null)).toBe(false);
    expect(canTransferPayments(undefined)).toBe(false);
  });
});

describe('canTransferPayment (estado del comprobante)', () => {
  it('deja transferir un pago suelto', () => {
    expect(canTransferPayment(payment())).toEqual({ allowed: true });
  });

  it('deja transferir uno vinculado a una operación abierta', () => {
    const p = payment({ operation_uuid: 'op-2291', operation_status: 'PENDING' });
    expect(canTransferPayment(p).allowed).toBe(true);
  });

  it('bloquea el conciliado: su operación ya se entregó y se cerró', () => {
    const block = canTransferPayment(
      payment({ operation_uuid: 'op-2291', operation_status: 'COMPLETED' }),
    );
    expect(block.allowed).toBe(false);
    expect(block.allowed === false && block.reason).toMatch(/conciliado/i);
  });

  it('bloquea el que ya se confirmó como depósito al fondo', () => {
    const p = payment({
      fund_deposit: {
        uuid: 'fd-1',
        status: 'CONFIRMED',
        amount: 220,
        currency: 'USD',
        group_name: 'Caja Guayana',
        username: 'andres',
      },
    });
    expect(canTransferPayment(p).allowed).toBe(false);
  });

  it('no bloquea si el depósito sigue pendiente de confirmar', () => {
    const p = payment({
      fund_deposit: {
        uuid: 'fd-1',
        status: 'PENDING',
        amount: 220,
        currency: 'USD',
        group_name: 'Caja Guayana',
        username: 'andres',
      },
    });
    expect(canTransferPayment(p).allowed).toBe(true);
  });

  it('bloquea el que ya se acreditó al saldo del cliente de origen', () => {
    expect(canTransferPayment(payment({ credited_to_balance: 220 })).allowed).toBe(false);
  });

  it('ignora un acreditado de cero (y los restos por redondeo)', () => {
    expect(canTransferPayment(payment({ credited_to_balance: 0 })).allowed).toBe(true);
    expect(canTransferPayment(payment({ credited_to_balance: 0.004 })).allowed).toBe(true);
  });

  it('bloquea el saliente que ya originó un préstamo', () => {
    // La deuda quedó a nombre del cliente de origen, con su valuación y sus abonos: mudar
    // el comprobante la dejaría con quien no la tiene.
    const block = canTransferPayment(
      payment({
        loan: {
          uuid: 'loan-1',
          status: 'OPEN',
          preferred_value: 'USDT',
          preferred_currency: 'USDT',
          principal_amount: 220,
          outstanding_amount: 220,
        },
      }),
    );
    expect(block.allowed).toBe(false);
    expect(block.allowed === false && block.reason).toMatch(/préstamo/i);
  });
});

describe('transferUnlinksOperation', () => {
  it('avisa solo cuando hay una operación de la que desengancharse', () => {
    expect(transferUnlinksOperation(payment())).toBe(false);
    expect(transferUnlinksOperation(payment({ operation_uuid: 'op-2291' }))).toBe(true);
  });
});

describe('transferBlockingField', () => {
  it('pide primero el destino y después el motivo', () => {
    expect(transferBlockingField(null, null)).toBe('destination');
    expect(transferBlockingField(null, 'THIRD_PARTY')).toBe('destination');
    expect(transferBlockingField('c-marielys', null)).toBe('reason');
    expect(transferBlockingField('c-marielys', 'THIRD_PARTY')).toBeNull();
  });
});

describe('transferReasonLabel', () => {
  it('traduce los motivos conocidos', () => {
    expect(transferReasonLabel('THIRD_PARTY')).toBe('Pagó un tercero');
    expect(transferReasonLabel('BOT_MISMATCH')).toBe('Mal asignado por el bot');
  });

  it('no se rompe sin motivo', () => {
    expect(transferReasonLabel(null)).toBe('sin motivo');
  });
});

describe('sharesSurname', () => {
  it('reconoce el apellido compartido pese a tildes y mayúsculas', () => {
    expect(sharesSurname('Yeimar A. Rondón', 'Marielys C. RONDON')).toBe(true);
  });

  it('no empareja apellidos distintos', () => {
    expect(sharesSurname('Yeimar A. Rondón', 'Marielys Fajardo')).toBe(false);
  });

  it('ignora partículas al buscar el apellido', () => {
    expect(sharesSurname('Ana de la Cruz', 'Pedro Cruz')).toBe(true);
  });

  it('un nombre suelto no tiene apellido que comparar', () => {
    expect(sharesSurname('Rondón', 'Marielys Rondón')).toBe(false);
    expect(sharesSurname(null, 'Marielys Rondón')).toBe(false);
    expect(sharesSurname('', '')).toBe(false);
  });
});
