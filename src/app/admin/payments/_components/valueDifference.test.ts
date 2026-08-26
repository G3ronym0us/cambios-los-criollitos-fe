import { describe, expect, it } from 'vitest';
import {
  buildValueDifference,
  differenceChoices,
  differenceCta,
  differenceNote,
  differenceTitle,
} from './ValueDifferenceStep';
import { pairRoundingFrom } from '@/utils/rounding';
import { formatNumber } from '@/utils/functions';
import type { PaymentTable } from '@/types/payment';

/** USD-VES tal como está en producción: la tasa se redondea a múltiplos de 5 hacia abajo. */
const USD_VES = pairRoundingFrom({
  rounding_mode: 'RATE',
  rounding_step: 5,
  rounding_direction: 'DOWN',
});

const RATE = 915;

/** Comprobante en VES (el lado calculado del par) contra una operación con valor en USD. */
function counterSide(typedValue: number, table: PaymentTable = 'outgoing', paymentAmount = 92500) {
  return buildValueDifference({
    table,
    paymentAmount,
    paymentCurrency: 'VES',
    valueCurrency: 'USD',
    counterCurrency: 'VES',
    rate: RATE,
    typedValue,
    rounding: USD_VES,
    creditableUsd: () => null,
  });
}

describe('buildValueDifference — comprobante del lado calculado', () => {
  it('plantea la diferencia cuando pasa la tolerancia del par', () => {
    const d = counterSide(100);
    expect(d).not.toBeNull();
    expect(d!.kind).toBe('over');
    expect(d!.onCounterSide).toBe(true);
    expect(d!.coveredInPaymentCurrency).toBe(91_500);
    expect(d!.diffPayment).toBe(1000);
    expect(d!.receiptValue).toBeCloseTo(101.0929, 4);
    expect(d!.diffValue).toBeCloseTo(1.0929, 4);
    expect(d!.quotedRate).toBe(915);
    expect(d!.effectiveRate).toBe(925);
    expect(d!.suspicious).toBe(false);
  });

  it('no pregunta nada por debajo de un escalón de redondeo', () => {
    // 101 USD cubren 92.415: los 85 VES que faltan son el propio redondeo del par.
    expect(counterSide(101)).toBeNull();
  });

  it('marca como faltante el comprobante que no cubre la operación', () => {
    const d = counterSide(110);
    expect(d!.kind).toBe('short');
    expect(d!.diffPayment).toBe(8150);
    expect(differenceChoices(d!)).toEqual([]);
    expect(differenceTitle(d!)).toBe(`Faltan ${formatNumber(8150)} VES para esta operación`);
  });

  it('marca como sospechosa la diferencia de un orden de magnitud', () => {
    const d = counterSide(10);
    expect(d!.suspicious).toBe(true);
    expect(differenceChoices(d!)).toEqual([]);
  });

  it('el título nombra lo que sobra en la moneda del comprobante', () => {
    expect(differenceTitle(counterSide(100)!)).toBe(`Sobran ${formatNumber(1000)} VES en este pago`);
  });
});

describe('buildValueDifference — comprobante del lado del valor', () => {
  const build = (typedValue: number, creditable: number | null) =>
    buildValueDifference({
      table: 'incoming',
      paymentAmount: 220,
      paymentCurrency: 'USD',
      valueCurrency: 'USD',
      counterCurrency: 'VES',
      rate: RATE,
      typedValue,
      rounding: USD_VES,
      creditableUsd: (_diffValue, diffPayment) => (creditable === null ? null : diffPayment),
    });

  it('mide la diferencia en la moneda del valor y no habla de tasas', () => {
    const d = build(200, null)!;
    expect(d.onCounterSide).toBe(false);
    expect(d.diffValue).toBe(20);
    expect(d.quotedRate).toBeNull();
    expect(d.effectiveRate).toBeNull();
    expect(differenceTitle(d)).toBe('Sobran 20 USD de este comprobante');
  });

  it('ofrece el saldo a favor solo cuando el sobrante puede acreditarse', () => {
    expect(differenceChoices(build(200, null)!)).toEqual(['raise', 'keep']);
    expect(differenceChoices(build(200, 20)!)).toEqual(['raise', 'balance', 'keep']);
  });

  it('un escalón de tasa no sirve de tolerancia para un comprobante en la otra moneda', () => {
    // 219,90 contra 220: sin traducción posible del paso de 5 VES/USD, manda el céntimo.
    expect(build(219.9, null)).not.toBeNull();
  });
});

describe('textos de la decisión', () => {
  const d = counterSide(100)!;

  it('el botón dice exactamente por cuánto va a crear', () => {
    expect(differenceCta(d, 'raise')).toBe('Crear por 101,09 USD');
    expect(differenceCta(d, 'keep')).toBe('Crear por 100 USD');
  });

  it('solo «dejarlo así» deja nota en la operación', () => {
    expect(differenceNote(d, 'raise')).toBeNull();
    expect(differenceNote(d, 'balance')).toBeNull();
    expect(differenceNote(d, 'keep')).toContain('925');
  });

  it('la nota dice DE QUIÉN es la diferencia, que depende de la bandeja', () => {
    // Saliente: la casa pagó de más y el cliente ya se lo llevó, no queda nada en la casa.
    expect(differenceNote(counterSide(100, 'outgoing')!, 'keep')).toContain(
      `se le pagaron ${formatNumber(1000)} VES de más al cliente`,
    );
    // Entrante: el que pagó de más fue el cliente, y eso sí se queda en la casa.
    expect(differenceNote(counterSide(100, 'incoming')!, 'keep')).toContain(
      `sobran ${formatNumber(1000)} VES, que se quedan en la casa`,
    );
  });

  it('un faltante no deja nota de diferencia dejada a propósito', () => {
    expect(differenceNote(counterSide(110)!, 'keep')).toBeNull();
  });
});
