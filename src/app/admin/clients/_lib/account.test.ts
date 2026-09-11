import { describe, expect, it } from 'vitest';
import type { BalanceEntry } from '@/types/client';
import type { OperationData } from '@/types/operation';
import { STATE_LABEL, accountCounts, accountThread, operationState } from './account';

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
    ...overrides,
  };
  // Por defecto el dinero entró cuando se registró la operación —el caso del bot—, así que
  // el orden no cambia salvo que la prueba diga otra cosa. Con `null` no hay deuda.
  return { first_incoming_payment_at: base.created_at, ...base } as OperationData;
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
    expect(operationState(op({ pending_amount: 0, status: 'COMPLETED' }))).toBe('delivered');
    expect(operationState(op({ status: 'QUOTED', pending_amount: 50 }))).toBe('quoted');
    expect(operationState(op({ status: 'CANCELLED', pending_amount: 50 }))).toBe('cancelled');
  });

  it('cubierta no es completada: sin cerrar sigue siendo «Pendiente»', () => {
    // Es la USD-VES que nace de su propio comprobante de salida: se crea cubierta y en
    // PENDING a la vez, porque los billetes del cliente se reciben después. Darla por
    // entregada aquí la enseñaba «Completado · Cobrada» mientras Pagos, que lee `status`,
    // la enseñaba «Pendiente».
    const cubierta = op({
      status: 'PENDING',
      pending_amount: 0,
      first_incoming_payment_at: null,
      settles_in_cash: true,
    });

    expect(operationState(cubierta)).toBe('open');
    expect(STATE_LABEL[operationState(cubierta)]).toBe('Pendiente');
    // Y sigue fuera de la cola de trabajo: no le debemos nada.
    expect(accountCounts([cubierta], [])).toMatchObject({ pending: 0, delivered: 1 });
  });

  it('sin el dinero del cliente no hay nada que entregar, pero tampoco está entregada', () => {
    // Ni «Por entregar» ni deuda: es un trato a medio armar, y el que debe es él. Fuera de
    // la cola, sí — pero rotularlo «Entregado» era decir que el trato terminó.
    expect(operationState(op({ pending_amount: 50, first_incoming_payment_at: null }))).toBe(
      'open',
    );
  });

  it('en un par de efectivo lo que se debe es el efectivo del cliente', () => {
    // Nadie fotografía un billete, así que el comprobante entrante no filtra nada. Y lo
    // que falta es `to_collect`: la operación está CUBIERTA —los bolívares ya salieron— y
    // aun así el cliente no ha traído un dólar.
    const efectivo = op({
      pending_amount: 0,
      to_collect: 50,
      first_incoming_payment_at: null,
      settles_in_cash: true,
    });

    expect(operationState(efectivo)).toBe('pending');
    expect(accountCounts([efectivo], [])).toMatchObject({ pending: 1, delivered: 0 });
  });

  it('cobrado el efectivo entero, la operación queda cerrada y se lee «Cobrada»', () => {
    // El backend la cierra al recoger el último dólar, así que aquí llega COMPLETED: sin
    // eso se quedaba en PENDING para siempre y la fila decía «Pendiente» tras marcarla.
    const cobrada = op({
      status: 'COMPLETED',
      pending_amount: 0,
      to_collect: 0,
      first_incoming_payment_at: null,
      settles_in_cash: true,
    });

    expect(operationState(cobrada)).toBe('delivered');
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

  it('«por entregar» ordena por antigüedad (primer pago), no por el pago más reciente', () => {
    // «vieja» pagó dos veces: su primer pago sigue siendo el más antiguo del lote, así
    // que sigue de primera en la cola aunque su último abono sea recentísimo. Cambiarla
    // de sitio por eso «rejuvenecería» una deuda vieja.
    const conAbonoReciente = operations.map((operation) =>
      operation.uuid === 'vieja'
        ? { ...operation, last_incoming_payment_at: '2026-08-31T00:00:00Z' }
        : operation,
    );
    expect(keys(accountThread(conAbonoReciente, entries, 'pending'))).toEqual([
      'op:vieja',
      'op:otro-par',
    ]);
  });

  it('el resto del hilo ordena por el pago MÁS RECIENTE, la misma fecha que la fila enseña', () => {
    // «vieja» se registró y cobró primero, pero su último abono es el hecho más reciente
    // del lote: en una vista de lectura (no la cola de «por entregar») debe subir arriba.
    const conAbonoReciente = operations.map((operation) =>
      operation.uuid === 'vieja'
        ? { ...operation, last_incoming_payment_at: '2026-08-31T00:00:00Z' }
        : operation,
    );
    expect(keys(accountThread(conAbonoReciente, entries, 'all'))).toEqual([
      'op:vieja',
      'op:nueva',
      'bal:e1',
      'op:otro-par',
    ]);
  });
});
