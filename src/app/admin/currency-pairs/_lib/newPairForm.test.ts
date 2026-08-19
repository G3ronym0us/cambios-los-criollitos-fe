import { describe, expect, it } from 'vitest';
import type { CurrencyPairData } from '@/types/admin';
import { describeMissingField, takenCurrencies } from './newPairForm';

const pair = (from: string, to: string, display: string) =>
  ({
    from_currency_uuid: from,
    to_currency_uuid: to,
    display_name: display,
  }) as CurrencyPairData;

const EXISTING = [
  pair('ves', 'usdt', 'VES/USDT'),
  pair('usdt', 'ves', 'USDT/VES'),
  pair('brl', 'usdt', 'BRL/USDT'),
];

describe('describeMissingField', () => {
  it('pide las monedas en el orden en que se rellenan', () => {
    expect(describeMissingField({ fromUuid: '', toUuid: '', description: '' })).toBe(
      'Falta la moneda de origen',
    );
    expect(describeMissingField({ fromUuid: 'ves', toUuid: '', description: '' })).toBe(
      'Falta la moneda de destino',
    );
    expect(describeMissingField({ fromUuid: 'ves', toUuid: 'usdt', description: '' })).toBe(
      'Falta la descripción',
    );
  });

  it('no acepta una descripción de solo espacios', () => {
    expect(
      describeMissingField({ fromUuid: 'ves', toUuid: 'usdt', description: '   ' }),
    ).toBe('Falta la descripción');
  });

  it('deja crear cuando está todo', () => {
    expect(
      describeMissingField({ fromUuid: 'ves', toUuid: 'usdt', description: 'Par base' }),
    ).toBeNull();
  });

  it('PERMITE la misma moneda a los dos lados: es una paridad 1:1', () => {
    // El caso USDT-USDT del par ZELLE→USDT. Bloquearlo dejaba esa configuración sin
    // forma de crearse desde el panel: el botón no se habilitaba nunca.
    expect(
      describeMissingField({ fromUuid: 'usdt', toUuid: 'usdt', description: 'Paridad 1:1' }),
    ).toBeNull();
  });
});

describe('takenCurrencies', () => {
  it('sin la otra moneda elegida no apaga nada', () => {
    expect(takenCurrencies(EXISTING, '', 'to').size).toBe(0);
  });

  it('apaga el destino cuyo par ya existe, diciendo cuál lo ocupa', () => {
    const taken = takenCurrencies(EXISTING, 'ves', 'to');
    expect(taken.get('usdt')).toBe('VES/USDT');
  });

  it('mira el lado correcto: con USDT de origen se apaga VES, no BRL', () => {
    const taken = takenCurrencies(EXISTING, 'usdt', 'to');
    expect(taken.get('ves')).toBe('USDT/VES');
    expect(taken.has('brl')).toBe(false);
  });

  it('no apaga la moneda contra sí misma mientras esa paridad no exista', () => {
    // Es lo que permite crear USDT-USDT: no hay par USDT/USDT todavía.
    expect(takenCurrencies(EXISTING, 'usdt', 'to').has('usdt')).toBe(false);
  });

  it('una vez creada la paridad, deja de ofrecerse', () => {
    const conParidad = [...EXISTING, pair('usdt', 'usdt', 'USDT/USDT')];
    expect(takenCurrencies(conParidad, 'usdt', 'to').get('usdt')).toBe('USDT/USDT');
  });
});
