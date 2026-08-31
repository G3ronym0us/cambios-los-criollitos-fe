import { describe, expect, it } from 'vitest';
import { impliedRate, isMultipleOf, marginOf, roundOptions } from './roundAmounts';

// El caso del diseño (6a): USD/VES, el comprobante trae 94.000 Bs y el lado USD
// sale 102,17. El par cotiza a 920, que sobre esta base son los 1,60 % de margen
// que muestra la línea de tasa.
const BASE_USD_VES = 935;

describe('impliedRate', () => {
  it('con el ancla en el lado que recibe, divide el ancla entre el monto libre', () => {
    // 94.000 ÷ 105 = 895,24 — el número que el diseño escribe.
    expect(impliedRate(94000, 105, 'RECEIVE')).toBeCloseTo(895.238, 3);
  });

  it('con el ancla en el lado que envía, multiplica al revés', () => {
    expect(impliedRate(100, 550, 'SEND')).toBeCloseTo(5.5, 6);
  });

  it('descarta montos no positivos', () => {
    expect(impliedRate(0, 105, 'RECEIVE')).toBeNull();
    expect(impliedRate(94000, 0, 'RECEIVE')).toBeNull();
  });
});

describe('marginOf', () => {
  it('reproduce los márgenes que el diseño pone en cada chip', () => {
    expect(marginOf(94000 / 105, BASE_USD_VES)).toBeCloseTo(4.25, 2);
    expect(marginOf(94000 / 100, BASE_USD_VES)).toBeCloseTo(-0.53, 2);
  });
});

describe('isMultipleOf', () => {
  it('reconoce el monto ya redondo', () => {
    expect(isMultipleOf(105, 5)).toBe(true);
    expect(isMultipleOf(147000, 100)).toBe(true);
    expect(isMultipleOf(102.17, 5)).toBe(false);
  });

  it('sin múltiplo no afirma nada', () => {
    expect(isMultipleOf(105, 0)).toBe(false);
  });
});

describe('roundOptions', () => {
  const usdVes = {
    anchorAmount: 94000,
    freeAmount: 102.17,
    anchorSide: 'RECEIVE' as const,
    step: 5,
    baseEffectiveRate: BASE_USD_VES,
    currentMargin: 1.6,
  };

  it('ofrece las dos opciones que rodean al monto, la mejor primero', () => {
    const [up, down] = roundOptions(usdVes);
    expect(up.amount).toBe(105);
    expect(up.margin).toBeCloseTo(4.25, 2);
    expect(up.registers).toBe(true);
    expect(up.recommended).toBe(true);

    expect(down.amount).toBe(100);
    expect(down.margin).toBeCloseTo(-0.53, 2);
    // Redondear hacia abajo cuesta plata: el backend no registrará margen.
    expect(down.registers).toBe(false);
    expect(down.recommended).toBe(false);
  });

  it('el chip perdedor nunca es el recomendado', () => {
    // Con el ancla tan baja que ambas opciones empeoran, no se recomienda ninguna.
    const options = roundOptions({ ...usdVes, currentMargin: 90 });
    expect(options.every((o) => !o.recommended)).toBe(true);
    // Pero siguen ofreciéndose: a veces se redondea a sabiendas.
    expect(options).toHaveLength(2);
  });

  it('reproduce el segundo caso del diseño: VES de 100 en 100', () => {
    // 620 USDT anclados, el bolívar libre en 147.042,30. La base es la tasa de
    // VES/USDT, 244,50 — el par del que este deriva.
    const options = roundOptions({
      anchorAmount: 620,
      freeAmount: 147042.3,
      anchorSide: 'SEND',
      step: 100,
      baseEffectiveRate: 244.5,
      currentMargin: 2.96,
    });
    expect(options.map((o) => o.amount)).toEqual([147000, 147100]);
    expect(options[0].margin).toBeCloseTo(3.03, 2);
    expect(options[1].margin).toBeCloseTo(2.96, 2);
    expect(options[0].recommended).toBe(true);
  });

  it('no sugiere nada cuando el monto libre ya es múltiplo', () => {
    expect(roundOptions({ ...usdVes, freeAmount: 105 })).toEqual([]);
  });

  it('no sugiere nada sin múltiplo configurado en el par', () => {
    expect(roundOptions({ ...usdVes, step: null })).toEqual([]);
    expect(roundOptions({ ...usdVes, step: 0 })).toEqual([]);
  });

  it('no sugiere nada sin tasa base con la que medir el margen', () => {
    expect(roundOptions({ ...usdVes, baseEffectiveRate: null })).toEqual([]);
  });

  it('descarta el redondeo hacia abajo que dejaría el lado en cero', () => {
    const options = roundOptions({ ...usdVes, freeAmount: 2.5, step: 5 });
    expect(options.map((o) => o.amount)).toEqual([5]);
  });
});
