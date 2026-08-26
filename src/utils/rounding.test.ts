import { describe, expect, it } from 'vitest';
import { pairRoundingFrom, quotePair } from './rounding';

/**
 * El caso vivo de producción: USD-VES redondea la TASA a múltiplos de 5 hacia abajo, así
 * que la tasa cruda del scraper (919,005) se cotiza a 915. Es el número que el bot le da
 * al cliente y el que tiene que quedar registrado al dar de alta la operación a mano.
 */
const USD_VES = {
  rounding_mode: 'RATE',
  rounding_step: 5,
  rounding_direction: 'DOWN',
  rounding_amount_side: null,
};

describe('pairRoundingFrom', () => {
  it('lee la config del par tal como viene en /rates', () => {
    expect(pairRoundingFrom(USD_VES)).toEqual({
      mode: 'RATE',
      step: 5,
      direction: 'DOWN',
      amountSide: null,
    });
  });

  it('ignora configs incompletas o desactivadas', () => {
    expect(pairRoundingFrom({ rounding_mode: null })).toBeNull();
    expect(pairRoundingFrom({ rounding_mode: 'RATE', rounding_step: 0, rounding_direction: 'DOWN' })).toBeNull();
    expect(pairRoundingFrom({ rounding_mode: 'RATE', rounding_step: 5 })).toBeNull();
    // Modo AMOUNT sin lado no dice qué redondear.
    expect(pairRoundingFrom({ rounding_mode: 'AMOUNT', rounding_step: 100, rounding_direction: 'UP' })).toBeNull();
  });
});

describe('quotePair — modo RATE', () => {
  const rounding = pairRoundingFrom(USD_VES);

  it('cotiza el destino con la tasa redondeada', () => {
    const quoted = quotePair(10, 919.005, false, 'SEND', rounding);
    expect(quoted.fromAmount).toBe(10);
    expect(quoted.toAmount).toBe(9150);
    expect(quoted.rate).toBe(915);
    expect(quoted.inverse).toBe(false);
  });

  it('vuelve del destino al origen con la misma tasa redondeada', () => {
    const quoted = quotePair(9150, 919.005, false, 'RECEIVE', rounding);
    expect(quoted.fromAmount).toBeCloseTo(10, 10);
    expect(quoted.toAmount).toBe(9150);
    expect(quoted.rate).toBe(915);
  });

  it('sin config de redondeo deja la tasa cruda', () => {
    const quoted = quotePair(10, 919.005, false, 'SEND', null);
    expect(quoted.toAmount).toBeCloseTo(9190.05, 6);
    expect(quoted.rate).toBe(919.005);
  });

  it('una tasa que ya es múltiplo del paso no salta de escalón', () => {
    expect(quotePair(1, 915, false, 'SEND', rounding).rate).toBe(915);
  });
});

describe('quotePair — modo AMOUNT', () => {
  const rounding = pairRoundingFrom({
    rounding_mode: 'AMOUNT',
    rounding_step: 100,
    rounding_direction: 'UP',
    rounding_amount_side: 'TO',
  });

  it('redondea el lado calculado, no el que escribió el operador', () => {
    const quoted = quotePair(10, 919.005, false, 'SEND', rounding);
    expect(quoted.fromAmount).toBe(10);
    expect(quoted.toAmount).toBe(9200);
    // La tasa del par no cambia: el redondeo cayó sobre el monto.
    expect(quoted.rate).toBe(919.005);
  });

  it('no toca el lado que es el input de la cotización', () => {
    const quoted = quotePair(9150, 919.005, false, 'RECEIVE', rounding);
    expect(quoted.toAmount).toBe(9150);
  });
});
