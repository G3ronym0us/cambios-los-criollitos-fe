import { describe, expect, it } from 'vitest';
import type { PaymentData, PaymentSuggestion } from '@/types/payment';
import { describePayment, describeSuggestion } from './paymentRowData';

// Un entrante mínimo: lo único que importa para estas pruebas es `created_at`.
function payment(overrides: Partial<PaymentData> = {}): PaymentData {
  return {
    id: 1,
    uuid: 'p-1',
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

// "Ahora" fijo para las pruebas: 2026-08-31 16:00 hora Caracas (UTC-4).
const NOW = new Date('2026-08-31T20:00:00Z');

describe('describePayment · when (el caso que le faltaba a la tarjeta de mobile)', () => {
  it('un pago de hoy se queda solo con la hora, sin repetir "hoy" en cada fila', () => {
    const d = describePayment(payment({ created_at: '2026-08-31T14:42:00Z' }), NOW);
    expect(d.day).toBe('hoy');
    expect(d.when).toBe('10:42');
  });

  it('un pago de ayer antepone "ayer" a la hora', () => {
    const d = describePayment(payment({ created_at: '2026-08-30T14:42:00Z' }), NOW);
    expect(d.day).toBe('ayer');
    expect(d.when).toBe('ayer 10:42');
  });

  it('un pago más viejo antepone la fecha corta a la hora', () => {
    const d = describePayment(payment({ created_at: '2026-08-20T14:42:00Z' }), NOW);
    expect(d.day).toBe('20 ago.'); // Intl.DateTimeFormat('es-VE') abrevia el mes con punto
    expect(d.when).toBe('20 ago. 10:42');
  });

  it('respeta la medianoche de Caracas, no la de UTC', () => {
    // 2026-08-31T03:30:00Z son las 23:30 del 30 de agosto en Caracas (UTC-4): un pago
    // de ayer aunque la fecha en UTC ya diga 31. Antes de fijar `now` como parámetro,
    // este caso dependía del reloj de la máquina y no se podía probar.
    const d = describePayment(payment({ created_at: '2026-08-31T03:30:00Z' }), NOW);
    expect(d.day).toBe('ayer');
    expect(d.when).toBe('ayer 23:30');
  });

  it('sin created_at no rompe: hora y day quedan vacíos', () => {
    const d = describePayment(payment({ created_at: null }), NOW);
    expect(d.time).toBe('—');
    expect(d.when).toBe('—');
  });
});

describe('describeSuggestion', () => {
  const base: PaymentSuggestion = {
    payment_id: 1,
    kind: 'LINK',
    operation_uuid: 'u',
    confident: true,
    coverage: 'CLOSES',
    client_name: 'Nelson',
    client_uuid: 'c',
    same_client: true,
    operation_created_at: '2026-09-07T15:10:39Z',
    hours_apart: 2.88,
    status: 'QUOTED',
    expired: true,
    score: 0.9,
    delta: 0,
    from_amount: 200,
    from_currency: 'ZELLE',
    to_amount: 177192,
    to_currency: 'VES',
    missing_before: 200,
    missing_after: 0,
    create_hint: null,
  };

  it('no repite el cliente cuando la operación es del mismo chat', () => {
    expect(describeSuggestion(base)).toBe('cierra · hace 2 h 53');
  });

  it('nombra al cliente cuando la operación es de otro', () => {
    expect(describeSuggestion({ ...base, same_client: false, client_name: 'Arianna' })).toBe(
      'Arianna · cierra · hace 2 h 53',
    );
  });

  it('dice cuánto abona y cuánto queda', () => {
    expect(
      describeSuggestion({ ...base, coverage: 'PARTIAL', missing_before: 500, missing_after: 300, hours_apart: 0.2 }),
    ).toBe('abona 200, quedan 300 · hace 12 min');
  });

  it('propone crear cuando no hay operación', () => {
    expect(
      describeSuggestion({
        ...base,
        kind: 'CREATE',
        coverage: null,
        operation_uuid: null,
        create_hint: {
          pair_symbol: 'ZELLE/VES',
          from_amount: 200,
          to_amount: 177192,
          reason: 'preferred',
          rate: 885.96,
          rate_at: '2026-09-07',
          pair_uuid: 'p',
          from_currency: 'ZELLE',
          to_currency: 'VES',
        },
      }),
    ).toBe('crear ZELLE/VES · 200 → 177.192');
  });
});
