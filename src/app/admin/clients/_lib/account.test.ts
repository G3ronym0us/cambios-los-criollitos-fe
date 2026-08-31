import { describe, expect, it } from 'vitest';
import type { BalanceEntry } from '@/types/client';
import type { OperationData } from '@/types/operation';
import { accountCounts, accountThread, operationState } from './account';

function op(overrides: Partial<OperationData>): OperationData {
  return {
    status: 'PENDING',
    pending_amount: 0,
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

function entry(overrides: Partial<BalanceEntry>): BalanceEntry {
  return {
    uuid: 'e1',
    entry_type: 'CREDIT',
    amount: 40,
    currency: 'USD',
    created_at: '2026-08-29T00:00:00Z',
    ...overrides,
  } as BalanceEntry;
}

describe('operationState', () => {
  it('separa lo pendiente de lo entregado, y saca cotizadas y canceladas del medio', () => {
    expect(operationState(op({ pending_amount: 50 }))).toBe('pending');
    expect(operationState(op({ pending_amount: 0 }))).toBe('delivered');
    expect(operationState(op({ status: 'QUOTED', pending_amount: 50 }))).toBe('quoted');
    expect(operationState(op({ status: 'CANCELLED', pending_amount: 50 }))).toBe('cancelled');
  });
});

describe('accountCounts', () => {
  it('«todo» son las operaciones más los movimientos de saldo, y entregado es el resto', () => {
    const counts = accountCounts(
      [op({ uuid: 'a', pending_amount: 50 }), op({ uuid: 'b' }), op({ uuid: 'c' })],
      [entry({ uuid: 'e1' }), entry({ uuid: 'e2' })],
    );

    expect(counts).toEqual({ all: 5, pending: 1, delivered: 2, balance: 2 });
  });
});

describe('accountThread', () => {
  const operations = [
    op({ uuid: 'vieja', pending_amount: 50, created_at: '2026-08-01T00:00:00Z' }),
    op({ uuid: 'nueva', created_at: '2026-08-28T00:00:00Z' }),
    op({
      uuid: 'otro-par',
      pending_amount: 10,
      pair_symbol: 'VES/COP',
      created_at: '2026-08-15T00:00:00Z',
    }),
  ];
  const entries = [entry({ uuid: 'e1', created_at: '2026-08-20T00:00:00Z' })];

  const keys = (items: { key: string }[]) => items.map((item) => item.key);

  it('«todo» funde los dos tipos, del más nuevo al más viejo', () => {
    expect(keys(accountThread(operations, entries, 'all'))).toEqual([
      'op:nueva',
      'bal:e1',
      'op:otro-par',
      'op:vieja',
    ]);
  });

  it('«por entregar» deja sólo lo pendiente y ordena de la más vieja a la más nueva', () => {
    expect(keys(accountThread(operations, entries, 'pending'))).toEqual([
      'op:vieja',
      'op:otro-par',
    ]);
  });

  it('«entregado» excluye lo pendiente y no trae movimientos de saldo', () => {
    expect(keys(accountThread(operations, entries, 'delivered'))).toEqual(['op:nueva']);
  });

  it('«saldo» sólo trae el ledger', () => {
    expect(keys(accountThread(operations, entries, 'balance'))).toEqual(['bal:e1']);
  });

  it('el par acota las operaciones y deja fuera el saldo, que no pertenece a ninguno', () => {
    expect(keys(accountThread(operations, entries, 'all', { pair: 'VES/COP' }))).toEqual([
      'op:otro-par',
    ]);
  });

  it('ordena por la fecha del comprobante cuando se conoce', () => {
    // «nueva» se registró la última, pero su dinero entró antes que todo lo demás.
    const dates = new Map([['nueva', '2026-07-01T00:00:00Z']]);
    expect(keys(accountThread(operations, entries, 'all', { dates }))).toEqual([
      'bal:e1',
      'op:otro-par',
      'op:vieja',
      'op:nueva',
    ]);
  });
});
