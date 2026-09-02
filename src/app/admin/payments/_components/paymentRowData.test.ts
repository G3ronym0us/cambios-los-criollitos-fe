import { describe, expect, it } from 'vitest';
import type { PaymentData } from '@/types/payment';
import { describePayment, resolveLinkButtonVariant } from './paymentRowData';

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

describe('resolveLinkButtonVariant (la tarjeta de mobile: "Vincular sugerida" se pinta relleno)', () => {
  it('con sugerencia, "Vincular" pasa a relleno aunque getPaymentAction diga outline', () => {
    expect(resolveLinkButtonVariant({ label: 'Vincular', variant: 'outline' }, true)).toBe('primary');
  });

  it('sin sugerencia, "Vincular" se queda como venía (outline)', () => {
    expect(resolveLinkButtonVariant({ label: 'Vincular', variant: 'outline' }, false)).toBe('outline');
  });

  it('otras acciones no se ven afectadas por la sugerencia (p. ej. "Gestionar" o "Corregir")', () => {
    expect(resolveLinkButtonVariant({ label: 'Gestionar', variant: 'outline' }, true)).toBe('outline');
    expect(resolveLinkButtonVariant({ label: 'Corregir', variant: 'danger' }, true)).toBe('danger');
  });
});
