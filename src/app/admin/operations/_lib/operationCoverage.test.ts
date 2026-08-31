import { describe, expect, it } from 'vitest';
import type { OperationData } from '@/types/operation';
import { getCoverage, rateDeviation, timeSince, timeUntil } from './operationCoverage';

const op = (over: Partial<OperationData> = {}) =>
  ({
    status: 'PENDING',
    pending_amount: 0,
    payments_count: 1,
    currency: 'USD',
    from_currency: 'USD',
    delivery_status: null,
    no_payments_ack_at: null,
    no_payments_ack_by_username: null,
    rate_used: 262,
    real_rate: null,
    ...over,
  }) as OperationData;

describe('getCoverage', () => {
  it('una cancelada no pide nada, aunque le falte dinero', () => {
    const c = getCoverage(op({ status: 'CANCELLED', pending_amount: 500, payments_count: 0 }));
    expect(c.kind).toBe('none');
    expect(c.label).toBe('—');
    expect(c.tone).toBe('neutral');
  });

  it('una cotizada todavía no es un trato', () => {
    expect(getCoverage(op({ status: 'QUOTED', payments_count: 0 })).kind).toBe('quote');
  });

  it('cubierta en dinero pero esperando el efectivo es entrega, no cuadre', () => {
    const c = getCoverage(op({ pending_amount: 0, delivery_status: 'PENDING' }));
    expect(c.kind).toBe('delivery');
    expect(c.label).toBe('Por entregar');
  });

  it('sin comprobantes pide vincular uno', () => {
    const c = getCoverage(op({ payments_count: 0, pending_amount: 350 }));
    expect(c.kind).toBe('missing');
    expect(c.tone).toBe('destructive');
    expect(c.detail).toContain('vincula');
  });

  it('sin comprobantes pero aceptado a mano deja de ser alerta', () => {
    const c = getCoverage(
      op({
        payments_count: 0,
        pending_amount: 350,
        no_payments_ack_at: '2026-08-12T10:00:00Z',
        no_payments_ack_by_username: 'Yeimi R.',
      })
    );
    expect(c.kind).toBe('missing');
    expect(c.tone).toBe('neutral');
    expect(c.detail).toContain('Yeimi R.');
  });

  it('con comprobantes que no alcanzan dice cuánto falta', () => {
    const c = getCoverage(op({ pending_amount: 120, payments_count: 2 }));
    expect(c.kind).toBe('short');
    expect(c.label).toBe('Faltan 120,00 USD');
    expect(c.detail).toBe('2 comprobantes');
  });

  it('cubierta cuenta sus comprobantes, en singular cuando es uno', () => {
    expect(getCoverage(op({ payments_count: 1 })).detail).toBe('1 comprobante');
    expect(getCoverage(op({ payments_count: 3 })).detail).toBe('3 comprobantes');
    expect(getCoverage(op({ payments_count: 1 })).kind).toBe('covered');
  });

  it('trata un resto de céntimos como cubierta', () => {
    // Un redondeo no debe dejar una operación marcada como incompleta para siempre.
    expect(getCoverage(op({ pending_amount: 0.004 })).kind).toBe('covered');
    expect(getCoverage(op({ pending_amount: 0.5 })).kind).toBe('short');
  });
});

describe('rateDeviation', () => {
  it('mide la tasa real contra la cotizada', () => {
    // El caso del diseño: cotizada 262,00 y real 259,14.
    expect(rateDeviation(op({ rate_used: 262, real_rate: 259.14 }))).toBeCloseTo(-1.09, 2);
  });

  it('no inventa desviación sin tasa real', () => {
    expect(rateDeviation(op({ real_rate: null }))).toBeNull();
    expect(rateDeviation(op({ rate_used: 0, real_rate: 100 }))).toBeNull();
  });
});

describe('timeUntil / timeSince', () => {
  const now = new Date('2026-08-31T12:00:00Z').getTime();

  it('cuenta lo que le queda a una cotización', () => {
    expect(timeUntil('2026-08-31T12:06:00Z', now)).toBe('en 6 min');
    expect(timeUntil('2026-08-31T14:00:00Z', now)).toBe('en 2 h');
    expect(timeUntil('2026-08-31T11:00:00Z', now)).toBe('vencida');
    expect(timeUntil(null, now)).toBeNull();
  });

  it('cuenta la antigüedad de lo que espera', () => {
    expect(timeSince('2026-08-29T12:00:00Z', now)).toBe('hace 2 días');
    expect(timeSince('2026-08-31T11:30:00Z', now)).toBe('hace 30 min');
    expect(timeSince(null, now)).toBeNull();
  });
});
