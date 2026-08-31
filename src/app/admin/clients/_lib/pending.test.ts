import { describe, expect, it } from 'vitest';
import type { OperationData } from '@/types/operation';
import {
  formatPendingBreakdown,
  pendingByPair,
  pendingSince,
  pendingTotals,
  totalsByCurrency,
} from './pending';

/** Una operación sin cubrir, con lo justo para lo que se prueba aquí. */
function op(overrides: Partial<OperationData>): OperationData {
  return {
    status: 'PENDING',
    pending_amount: 100,
    currency: 'USD',
    from_currency: 'USD',
    to_currency: 'VES',
    pair_symbol: 'USD/VES',
    from_amount: 100,
    to_amount: 28_000,
    created_at: '2026-08-30T00:00:00Z',
    quoted_at: '2026-08-30T00:00:00Z',
    ...overrides,
  } as OperationData;
}

describe('pendingSince', () => {
  it('usa la fecha del comprobante cuando se conoce, no la de la operación', () => {
    // El caso de una op creada a mano: registrada hoy, pero el dinero llegó hace una semana.
    const manual = op({ uuid: 'manual', created_at: '2026-08-31T00:00:00Z' });
    const dates = new Map([['manual', '2026-08-24T00:00:00Z']]);

    expect(pendingSince(manual, dates)).toBe('2026-08-24T00:00:00Z');
    expect(pendingSince(manual)).toBe('2026-08-31T00:00:00Z');
  });

  it('se cae a la fecha de la operación cuando no hay comprobante', () => {
    const bot = op({ uuid: 'bot', created_at: '2026-08-28T00:00:00Z' });
    // Resuelto y sin comprobante: `null` en el mapa, no ausencia.
    expect(pendingSince(bot, new Map([['bot', null]]))).toBe('2026-08-28T00:00:00Z');
  });

  it('la agrupación toma la más vieja según la fecha del comprobante', () => {
    const operations = [
      op({ uuid: 'reciente', created_at: '2026-08-20T00:00:00Z' }),
      op({ uuid: 'manual', created_at: '2026-08-31T00:00:00Z' }),
    ];
    const dates = new Map([['manual', '2026-08-01T00:00:00Z']]);

    expect(pendingByPair(operations)[0].oldest_at).toBe('2026-08-20T00:00:00Z');
    expect(pendingByPair(operations, dates)[0].oldest_at).toBe('2026-08-01T00:00:00Z');
  });
});

describe('totales con varias monedas', () => {
  const mixed = [
    op({ uuid: 'a', pending_amount: 100, currency: 'USD', pair_symbol: 'USD/VES' }),
    op({
      uuid: 'b',
      pending_amount: 5_000,
      currency: 'VES',
      from_currency: 'VES',
      to_currency: 'COP',
      pair_symbol: 'VES/COP',
    }),
  ];

  it('el total se queda sin moneda en vez de sumar dólares con bolívares', () => {
    const totals = pendingTotals(pendingByPair(mixed));

    expect(totals.currency).toBeNull();
    expect(totals.payout_amount).toBeNull();
    expect(totals.operations).toBe(2);
  });

  it('el desglose enseña cada moneda por separado', () => {
    expect(formatPendingBreakdown(pendingByPair(mixed))).toBe('5.000,00 VES + 100,00 USD');
  });

  it('con una sola moneda el desglose es una cifra normal', () => {
    const single = pendingByPair([op({ uuid: 'a' }), op({ uuid: 'b' })]);
    expect(formatPendingBreakdown(single)).toBe('200,00 USD');
  });

  it('agrupa por moneda, no por par: dos pares en la misma moneda son una cifra', () => {
    const sameCurrency = [
      op({ uuid: 'a', pending_amount: 100, currency: 'USD', pair_symbol: 'USD/VES' }),
      op({ uuid: 'b', pending_amount: 50, currency: 'USD', pair_symbol: 'USD/COP' }),
    ];
    const totals = totalsByCurrency(pendingByPair(sameCurrency));

    expect(totals).toEqual([{ currency: 'USD', amount: 150 }]);
  });
});
