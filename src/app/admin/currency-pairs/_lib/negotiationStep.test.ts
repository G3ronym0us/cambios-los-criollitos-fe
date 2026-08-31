import { describe, expect, it } from 'vitest';
import {
  formatNegotiationStep,
  negotiationReferenceAmount,
  suggestNegotiationSteps,
} from './negotiationStep';

describe('negotiationReferenceAmount', () => {
  it('toma 100 unidades cuando se negocia en la moneda de origen', () => {
    expect(negotiationReferenceAmount(16.8397, 'FROM')).toBe(100);
    // La tasa no importa de este lado: las 100 unidades ya están en esa moneda.
    expect(negotiationReferenceAmount(null, 'FROM')).toBe(100);
  });

  it('convierte esas 100 unidades cuando se negocia en la moneda de destino', () => {
    expect(negotiationReferenceAmount(16.8397, 'TO')).toBeCloseTo(1683.97, 2);
  });

  it('devuelve null si el par todavía no tiene tasa con la que estimar', () => {
    expect(negotiationReferenceAmount(null, 'TO')).toBeNull();
    expect(negotiationReferenceAmount(0, 'TO')).toBeNull();
    expect(negotiationReferenceAmount(Number.NaN, 'TO')).toBeNull();
  });
});

describe('suggestNegotiationSteps', () => {
  it('propone la década que contiene la referencia y la siguiente', () => {
    // VES/COP a 16,8397 negociando en COP: se habla en pesos de 10.000.
    expect(suggestNegotiationSteps(1683.97)).toEqual([1000, 10000]);
    expect(suggestNegotiationSteps(100)).toEqual([100, 1000]);
    expect(suggestNegotiationSteps(5.4820)).toEqual([1, 10]);
  });

  it('no propone nada sin referencia utilizable', () => {
    expect(suggestNegotiationSteps(null)).toEqual([]);
    expect(suggestNegotiationSteps(0)).toEqual([]);
    expect(suggestNegotiationSteps(-5)).toEqual([]);
  });
});

describe('formatNegotiationStep', () => {
  it('escribe las cifras redondas sin decimales', () => {
    expect(formatNegotiationStep(10000)).toBe('10.000');
    expect(formatNegotiationStep(100)).toBe('100');
  });

  it('conserva decimales solo por debajo de 1', () => {
    expect(formatNegotiationStep(0.5)).toBe('0,5');
  });
});
