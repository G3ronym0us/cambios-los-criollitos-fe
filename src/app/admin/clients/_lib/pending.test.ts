import { describe, expect, it } from 'vitest';
import type { ClientPendingByPair } from '@/types/client';
import type { OperationData } from '@/types/operation';
import {
  coveredAmount,
  formatPendingBreakdown,
  isCashDebt,
  isPendingOperation,
  lastPaymentAt,
  outstandingAmount,
  pendingByPair,
  pendingSince,
  pendingTotals,
  totalsByCurrency,
  valueAmount,
} from './pending';

/** Una operación sin cubrir Y ya pagada por el cliente: una deuda de verdad. */
function op(overrides: Partial<OperationData>): OperationData {
  return {
    status: 'PENDING',
    pending_amount: 100,
    first_incoming_payment_at: '2026-08-30T00:00:00Z',
    settles_in_cash: false,
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

describe('isPendingOperation', () => {
  it('no le debemos nada mientras su dinero no haya entrado', () => {
    // El caso que rompía la pantalla: la operación existe y no está cubierta, pero el
    // cliente no ha pagado. Ahí el que debe es él, y la cuenta decía «Le debemos».
    const sinPagar = op({ uuid: 'sin-pagar', first_incoming_payment_at: null });

    expect(isPendingOperation(sinPagar)).toBe(false);
    expect(pendingByPair([sinPagar])).toEqual([]);
  });

  it('con su comprobante entrante sí es deuda', () => {
    expect(isPendingOperation(op({ uuid: 'pagada' }))).toBe(true);
  });

  it('una cotización no es deuda ni con dinero entrado', () => {
    expect(isPendingOperation(op({ uuid: 'q', status: 'QUOTED' }))).toBe(false);
  });
});

describe('pendingSince', () => {
  it('usa la fecha del comprobante, no la de la operación', () => {
    // El caso de una op creada a mano: registrada hoy, pero el dinero llegó hace una semana.
    const manual = op({
      uuid: 'manual',
      created_at: '2026-08-31T00:00:00Z',
      first_incoming_payment_at: '2026-08-24T00:00:00Z',
    });

    expect(pendingSince(manual)).toBe('2026-08-24T00:00:00Z');
  });

  it('se cae a la fecha de la operación cuando no hay comprobante', () => {
    // Pasa con las ya entregadas, que el hilo enseña aunque no tengan entrante.
    const bot = op({
      uuid: 'bot',
      created_at: '2026-08-28T00:00:00Z',
      first_incoming_payment_at: null,
    });

    expect(pendingSince(bot)).toBe('2026-08-28T00:00:00Z');
  });

  it('la agrupación toma la más vieja según la fecha del comprobante', () => {
    const operations = [
      op({ uuid: 'reciente', first_incoming_payment_at: '2026-08-20T00:00:00Z' }),
      op({
        uuid: 'manual',
        created_at: '2026-08-31T00:00:00Z',
        first_incoming_payment_at: '2026-08-01T00:00:00Z',
      }),
    ];

    expect(pendingByPair(operations)[0].oldest_at).toBe('2026-08-01T00:00:00Z');
  });
});

describe('lastPaymentAt', () => {
  it('sin ningún comprobante entrante se cae a la fecha de la operación', () => {
    // El caso `VIA_PARTNER` sin comprobante propio, o un par `settles_in_cash`.
    const sinComprobantes = op({
      uuid: 'sin-comprobantes',
      first_incoming_payment_at: null,
      last_incoming_payment_at: null,
      created_at: '2026-08-20T00:00:00Z',
    });

    expect(lastPaymentAt(sinComprobantes)).toBe('2026-08-20T00:00:00Z');
  });

  it('con un solo comprobante usa su fecha', () => {
    const unSoloPago = op({
      uuid: 'un-pago',
      first_incoming_payment_at: '2026-08-24T00:00:00Z',
      last_incoming_payment_at: '2026-08-24T00:00:00Z',
    });

    expect(lastPaymentAt(unSoloPago)).toBe('2026-08-24T00:00:00Z');
  });

  it('con varios comprobantes gana el MÁS RECIENTE, no el primero', () => {
    // Lo contrario de `pendingSince`, que en el mismo caso devuelve el primero: las dos
    // miden cosas distintas sobre la misma operación.
    const variosPagos = op({
      uuid: 'varios-pagos',
      first_incoming_payment_at: '2026-08-01T00:00:00Z',
      last_incoming_payment_at: '2026-08-24T00:00:00Z',
    });

    expect(lastPaymentAt(variosPagos)).toBe('2026-08-24T00:00:00Z');
    expect(pendingSince(variosPagos)).toBe('2026-08-01T00:00:00Z');
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

describe('valueAmount', () => {
  it('usa el valor del trato cuando la operación lo trae', () => {
    const parcial = op({ amount: 171_240, delivered_amount: 85_620, pending_amount: 85_620 });
    expect(valueAmount(parcial)).toBe(171_240);
  });

  it('suma entregado y pendiente en las operaciones viejas, que no traen `amount`', () => {
    // Sin este respaldo la columna «Valor» saldría vacía justo en las ops más antiguas,
    // que son las que llevan más tiempo esperando y las primeras de la cola.
    const vieja = op({ amount: null, delivered_amount: 40, pending_amount: 60 });
    expect(valueAmount(vieja)).toBe(100);
  });
});

describe('pares que se cambian en efectivo', () => {
  /**
   * El USD-VES de producción: el cliente llega con billetes y no hay nada que fotografiar.
   *
   * Nace CUBIERTA —el comprobante en bolívares ya salió y no queda nada por cuadrar— y sin
   * cobrar. Es justo la combinación que se caía de la cola: mirando `pending_amount` no
   * debía nada, cuando lo que debe es el efectivo entero.
   */
  function efectivo(overrides: Partial<OperationData> = {}): OperationData {
    return op({
      uuid: 'efectivo',
      settles_in_cash: true,
      first_incoming_payment_at: null,
      amount: 100,
      delivered_amount: 100,
      pending_amount: 0,
      collected_amount: null,
      to_collect: 100,
      ...overrides,
    });
  }

  it('lo que se debe es el efectivo del cliente, no lo que nos falte por cubrir', () => {
    // El corazón del asunto: cubrir la operación con el comprobante en bolívares es
    // NUESTRA pata. Medir por ahí la sacaba de la lista el mismo día en que se pagaba.
    const op = efectivo();

    expect(op.pending_amount).toBe(0);
    expect(outstandingAmount(op)).toBe(100);
    expect(isPendingOperation(op)).toBe(true);
    expect(pendingByPair([op])[0].amount).toBe(100);
  });

  it('un cobro parcial deja en la cola lo que falta, no el valor entero', () => {
    const media = efectivo({ collected_amount: 60, to_collect: 40 });

    expect(outstandingAmount(media)).toBe(40);
    expect(coveredAmount(media)).toBe(60);
    expect(pendingByPair([media])[0].amount).toBe(40);
  });

  it('cobrada del todo sale de la cola', () => {
    expect(isPendingOperation(efectivo({ collected_amount: 100, to_collect: 0 }))).toBe(false);
  });

  it('en un par normal se sigue mirando lo que no hemos cubierto', () => {
    expect(outstandingAmount(op({ uuid: 'normal', pending_amount: 70 }))).toBe(70);
  });

  it('sin comprobante entrante sigue siendo deuda', () => {
    // Exigirlo aquí borraba el par entero: en producción eran 134 operaciones sin cuadrar
    // y cero comprobantes de entrada, así que la pantalla salía vacía.
    expect(isPendingOperation(efectivo())).toBe(true);
    expect(pendingByPair([efectivo()])).toHaveLength(1);
  });

  it('una cotización tampoco cuenta en efectivo', () => {
    expect(isPendingOperation(efectivo({ status: 'QUOTED' }))).toBe(false);
  });

  it('el par viaja en la agrupación, que es lo que decide el rótulo', () => {
    expect(pendingByPair([efectivo()])[0].settles_in_cash).toBe(true);
    expect(pendingByPair([op({ uuid: 'normal' })])[0].settles_in_cash).toBe(false);
  });

  it('no indulta a las operaciones de los demás pares', () => {
    const normalSinPagar = op({ uuid: 'normal', first_incoming_payment_at: null });
    expect(isPendingOperation(normalSinPagar)).toBe(false);
  });

  it('la antigüedad se cae a la fecha de la operación, que es la única que hay', () => {
    expect(pendingSince(efectivo({ created_at: '2026-08-20T00:00:00Z' }))).toBe(
      '2026-08-20T00:00:00Z',
    );
  });
});

describe('isCashDebt', () => {
  const enEfectivo = { settles_in_cash: true } as ClientPendingByPair;
  const normal = { settles_in_cash: false } as ClientPendingByPair;

  it('todo en efectivo: lo que falta nos lo deben a nosotros', () => {
    expect(isCashDebt([enEfectivo, enEfectivo])).toBe(true);
  });

  it('mezclado se cae al neutro: no hay un rótulo cierto para las dos', () => {
    expect(isCashDebt([enEfectivo, normal])).toBe(false);
  });

  it('sin nada que rotular no es deuda en efectivo', () => {
    expect(isCashDebt([])).toBe(false);
    expect(isCashDebt([normal])).toBe(false);
  });
});

describe('coveredAmount', () => {
  it('suma los comprobantes y lo declarado en efectivo', () => {
    // El fallo real: al colocar 40 en una operación de 75, mirar sólo `delivered_amount`
    // dejaba la fila enseñando 35 como si el trato hubiera sido de 35 desde el principio.
    const parcial = op({ amount: 75, delivered_amount: 0, uncovered_amount: 40, pending_amount: 35 });
    expect(coveredAmount(parcial)).toBe(40);
    expect(valueAmount(parcial)).toBe(75);
  });

  it('cuenta las dos cuando las dos existen', () => {
    expect(coveredAmount(op({ delivered_amount: 20, uncovered_amount: 30 }))).toBe(50);
  });

  it('sin cubrir nada es cero, no NaN', () => {
    expect(coveredAmount(op({ delivered_amount: null, uncovered_amount: null }))).toBe(0);
  });

  it('respalda el valor de las operaciones viejas contando lo declarado en efectivo', () => {
    const vieja = op({ amount: null, delivered_amount: 20, uncovered_amount: 30, pending_amount: 50 });
    expect(valueAmount(vieja)).toBe(100);
  });
});
