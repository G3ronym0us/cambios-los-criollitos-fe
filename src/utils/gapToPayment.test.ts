import { describe, expect, it } from 'vitest';
import { formatGapToPayment } from './functions';

// Pago 6205 de Nelson: 2026-09-19 13:52 VET (17:52 UTC).
const PAGO = '2026-09-19T17:52:00Z';

describe('formatGapToPayment', () => {
  it('mide contra el pago, no contra hoy', () => {
    expect(formatGapToPayment('2026-09-19T17:38:00Z', PAGO)).toBe('14 min antes del pago');
    expect(formatGapToPayment('2026-09-08T21:04:00Z', PAGO)).toBe('10 d antes del pago');
  });

  it('dice "después" cuando la operación se creó tras el pago', () => {
    expect(formatGapToPayment('2026-09-19T20:00:00Z', PAGO)).toBe('2 h después del pago');
  });

  it('menos de un minuto es "junto al pago"', () => {
    expect(formatGapToPayment('2026-09-19T17:51:30Z', PAGO)).toBe('junto al pago');
  });

  it('sin alguna de las dos fechas no inventa nada', () => {
    expect(formatGapToPayment(null, PAGO)).toBe('');
    expect(formatGapToPayment('2026-09-19T17:38:00Z', null)).toBe('');
  });
});
