import { describe, expect, it } from 'vitest';
import type { BalanceEntry } from '@/types/client';
import type { OperationData } from '@/types/operation';
import {
  accountCounts,
  accountDate,
  accountThread,
  isAccountMovement,
  operationState,
} from './account';

/**
 * Una operación con movimiento: por defecto su dinero entró el día que se registró, que es
 * lo normal cuando el bot la reconoce. Lo interesante es sobrescribirlo.
 */
function op(overrides: Partial<OperationData>): OperationData {
  const base = {
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
    last_outgoing_payment_at: null,
    ...overrides,
  };
  return {
    first_incoming_payment_at: base.created_at,
    ...base,
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
    expect(
      operationState(
        op({ status: 'QUOTED', pending_amount: 50, first_incoming_payment_at: null }),
      ),
    ).toBe('quoted');
    expect(operationState(op({ status: 'CANCELLED', pending_amount: 50 }))).toBe('cancelled');
  });

  it('una cotización ya pagada se lee como deuda, no como cotización', () => {
    expect(operationState(op({ status: 'QUOTED', pending_amount: 50 }))).toBe('pending');
  });
});

describe('isAccountMovement', () => {
  it('deja fuera lo que no movió plata: canceladas y tratos sin ningún comprobante', () => {
    expect(isAccountMovement(op({ status: 'CANCELLED' }))).toBe(false);
    expect(isAccountMovement(op({ first_incoming_payment_at: null }))).toBe(false);
    expect(isAccountMovement(op({ status: 'QUOTED', first_incoming_payment_at: null }))).toBe(
      false,
    );
  });

  it('entra en cuanto hay un comprobante de cualquiera de los dos lados', () => {
    expect(isAccountMovement(op({}))).toBe(true);
    expect(
      isAccountMovement(
        op({ first_incoming_payment_at: null, last_outgoing_payment_at: '2026-08-30T00:00:00Z' }),
      ),
    ).toBe(true);
  });

  it('una completada entra aunque no se le vea comprobante: las viejas migradas no lo traen', () => {
    expect(isAccountMovement(op({ status: 'COMPLETED', first_incoming_payment_at: null }))).toBe(
      true,
    );
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

  it('no cuenta los tratos sin comprobante: no son movimientos de la cuenta', () => {
    const counts = accountCounts(
      [
        op({ uuid: 'a', pending_amount: 50 }),
        op({ uuid: 'sin-pago', pending_amount: 50, first_incoming_payment_at: null }),
        op({ uuid: 'cotizada', status: 'QUOTED', first_incoming_payment_at: null }),
      ],
      [],
    );

    expect(counts).toEqual({ all: 1, pending: 1, delivered: 0, balance: 0 });
  });

  it('cuenta lo que el chip va a enseñar de verdad: con par, acotado', () => {
    const operations = [
      op({ uuid: 'a', pending_amount: 50 }),
      op({ uuid: 'b' }),
      op({ uuid: 'c', pending_amount: 10, pair_symbol: 'VES/COP' }),
    ];
    const counts = accountCounts(operations, [entry({ uuid: 'e1' })], 'VES/COP');

    // «Todo» no incluye el saldo porque con un par elegido no se enseña...
    expect(counts.all).toBe(1);
    expect(counts.pending).toBe(1);
    expect(counts.delivered).toBe(0);
    // ...pero el chip de «Saldo» sí, porque su filtro ignora el par.
    expect(counts.balance).toBe(1);
  });
});

describe('accountDate', () => {
  it('mientras se debe manda la fecha de entrada: es desde cuándo espera', () => {
    const debt = op({
      pending_amount: 50,
      first_incoming_payment_at: '2026-08-02T00:00:00Z',
      last_outgoing_payment_at: null,
    });

    expect(accountDate(debt)).toBe('2026-08-02T00:00:00Z');
  });

  it('una vez entregada manda la de salida: ahí terminó el movimiento', () => {
    const done = op({
      status: 'COMPLETED',
      first_incoming_payment_at: '2026-08-02T00:00:00Z',
      last_outgoing_payment_at: '2026-08-29T00:00:00Z',
    });

    expect(accountDate(done)).toBe('2026-08-29T00:00:00Z');
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

  it('«saldo» ignora el par: su selector no se enseña y la lista quedaría vacía sin salida', () => {
    expect(keys(accountThread(operations, entries, 'balance', { pair: 'USD/VES' }))).toEqual([
      'bal:e1',
    ]);
  });

  it('el par acota las operaciones y deja fuera el saldo, que no pertenece a ninguno', () => {
    expect(keys(accountThread(operations, entries, 'all', { pair: 'VES/COP' }))).toEqual([
      'op:otro-par',
    ]);
  });

  it('ordena por la fecha del comprobante, no por la de la operación', () => {
    // «nueva» se registró la última, pero su dinero entró antes que todo lo demás.
    const manual = [
      operations[0],
      op({
        uuid: 'nueva',
        created_at: '2026-08-28T00:00:00Z',
        first_incoming_payment_at: '2026-07-01T00:00:00Z',
      }),
      operations[2],
    ];

    expect(keys(accountThread(manual, entries, 'all'))).toEqual([
      'bal:e1',
      'op:otro-par',
      'op:vieja',
      'op:nueva',
    ]);
  });

  it('no enseña tratos sin comprobante ni cotizaciones: la cuenta son movimientos', () => {
    const noisy = [
      ...operations,
      op({ uuid: 'sin-pago', pending_amount: 50, first_incoming_payment_at: null }),
      op({ uuid: 'cotizada', status: 'QUOTED', first_incoming_payment_at: null }),
    ];

    expect(keys(accountThread(noisy, entries, 'all'))).not.toContain('op:sin-pago');
    expect(keys(accountThread(noisy, entries, 'all'))).not.toContain('op:cotizada');
    expect(keys(accountThread(noisy, entries, 'delivered'))).toEqual(['op:nueva']);
  });
});
