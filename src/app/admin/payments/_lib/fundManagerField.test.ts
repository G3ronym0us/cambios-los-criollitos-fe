import { describe, expect, it } from 'vitest';
import type { FundGroup } from '@/types/fund';
import {
  defaultManagerFor,
  filterFundCandidates,
  fundBadge,
  fundFieldMode,
  isFundFromPayment,
  isManagerOverridden,
  matchesPairCurrency,
  personInitials,
  settleCurrency,
  splitFundOptions,
} from './fundManagerField';

function group(overrides: Partial<FundGroup>): FundGroup {
  return {
    uuid: 'g1',
    name: 'Fondo',
    is_active: true,
    created_at: '2026-08-30T00:00:00Z',
    ...overrides,
  };
}

describe('settleCurrency', () => {
  it('liquida Zelle y Paypal como USD', () => {
    expect(settleCurrency('ZELLE')).toBe('USD');
    expect(settleCurrency('paypal')).toBe('USD');
  });

  it('deja las demás monedas tal cual, en mayúsculas', () => {
    expect(settleCurrency('ves')).toBe('VES');
  });

  it('no revienta con vacío o null', () => {
    expect(settleCurrency(null)).toBe('');
    expect(settleCurrency(undefined)).toBe('');
  });
});

describe('matchesPairCurrency', () => {
  it('casa si liquida en la moneda de origen o la de destino', () => {
    expect(matchesPairCurrency(group({ currency: 'VES' }), 'USD', 'VES')).toBe(true);
    expect(matchesPairCurrency(group({ currency: 'USD' }), 'USD', 'VES')).toBe(true);
  });

  it('no casa con una tercera moneda', () => {
    expect(matchesPairCurrency(group({ currency: 'COP' }), 'USD', 'VES')).toBe(false);
  });

  it('un fondo sin moneda nunca casa', () => {
    expect(matchesPairCurrency(group({ currency: undefined }), 'USD', 'VES')).toBe(false);
  });
});

describe('splitFundOptions', () => {
  const ve = group({ uuid: 've', currency: 'VES' });
  const co = group({ uuid: 'co', currency: 'COP' });
  const br = group({ uuid: 'br', currency: 'BRL' });

  it('sugiere los de la moneda del par y deja el resto elegible', () => {
    // Lo que rompía «Cambiar»: `others` no se descarta, así que con un solo sugerido el paso
    // sigue teniendo qué ofrecer.
    expect(splitFundOptions([ve, co, br], 'USD', 'VES')).toEqual({ suggested: [ve], others: [co, br] });
  });

  it('sube el fondo del pago a los sugeridos, y de primero', () => {
    // El caso real: el comprobante llegó por «Efectivo Caracas» en COP y el operador eligió
    // USD/VES. Sin esto el campo se vería vacío con un valor puesto.
    expect(splitFundOptions([ve, co, br], 'USD', 'VES', 'co')).toEqual({
      suggested: [co, ve],
      others: [br],
    });
  });

  it('sube también el ya elegido, aunque no case', () => {
    expect(splitFundOptions([ve, co, br], 'USD', 'VES', null, 'br')).toEqual({
      suggested: [ve, br],
      others: [co],
    });
  });

  it('sin fondos que casen, todos quedan como otros', () => {
    expect(splitFundOptions([co, br], 'USD', 'VES')).toEqual({ suggested: [], others: [co, br] });
  });
});

describe('defaultManagerFor / isManagerOverridden', () => {
  const g = group({
    members: [
      { uuid: 'm1', user_uuid: 'u1', username: 'Katiuska M.', is_fund_manager: false },
      { uuid: 'm2', user_uuid: 'u2', username: 'Yorman C.', is_fund_manager: true },
    ],
  });

  it('el gestor por defecto es el marcado is_fund_manager', () => {
    expect(defaultManagerFor(g)?.user_uuid).toBe('u2');
  });

  it('sin nadie marcado, cae al primero', () => {
    const sinMarca = group({ members: [{ uuid: 'm1', user_uuid: 'u1', username: 'X', is_fund_manager: false }] });
    expect(defaultManagerFor(sinMarca)?.user_uuid).toBe('u1');
  });

  it('un fondo sin miembros no tiene gestor', () => {
    expect(defaultManagerFor(group({ members: [] }))).toBeUndefined();
  });

  it('detecta cuando el gestor elegido no es el del fondo', () => {
    expect(isManagerOverridden(g, 'u1')).toBe(true);
    expect(isManagerOverridden(g, 'u2')).toBe(false);
  });

  it('sin gestor elegido todavía no hay nada que marcar', () => {
    expect(isManagerOverridden(g, '')).toBe(false);
  });
});

describe('isFundFromPayment', () => {
  it('compara contra el fondo del pago', () => {
    expect(isFundFromPayment('ve', 've')).toBe(true);
    expect(isFundFromPayment('ve', 'co')).toBe(false);
  });

  it('sin fondo elegido nunca es el del pago', () => {
    expect(isFundFromPayment('', 've')).toBe(false);
  });
});

describe('fundFieldMode', () => {
  it('2 o 3 sugeridos caben como chips', () => {
    expect(fundFieldMode(2)).toBe('chips');
    expect(fundFieldMode(3)).toBe('chips');
  });

  it('con uno solo o con cuatro o más, el campo cerrado', () => {
    expect(fundFieldMode(0)).toBe('field');
    expect(fundFieldMode(1)).toBe('field');
    expect(fundFieldMode(4)).toBe('field');
    expect(fundFieldMode(9)).toBe('field');
  });
});

describe('fundBadge', () => {
  it('usa el código de dos letras cuando el nombre ya termina en uno', () => {
    expect(fundBadge('Criollitos VE')).toBe('VE');
    expect(fundBadge('Criollitos CO')).toBe('CO');
  });

  it('sin código, toma las iniciales de las dos primeras palabras', () => {
    expect(fundBadge('Efectivo Caracas')).toBe('EC');
  });

  it('con una sola palabra, sus dos primeras letras', () => {
    expect(fundBadge('Nequi')).toBe('NE');
  });

  it('no revienta con vacío o null', () => {
    expect(fundBadge('')).toBe('??');
    expect(fundBadge(null)).toBe('??');
  });
});

describe('personInitials', () => {
  it('toma la inicial del nombre y del apellido', () => {
    expect(personInitials('Yorman C.')).toBe('YC');
    expect(personInitials('Katiuska M.')).toBe('KM');
  });

  it('con un solo nombre, sus dos primeras letras', () => {
    expect(personInitials('Root')).toBe('RO');
  });

  it('no revienta con vacío o null', () => {
    expect(personInitials('')).toBe('??');
    expect(personInitials(undefined)).toBe('??');
  });
});

describe('filterFundCandidates', () => {
  const ve = group({ uuid: 've', name: 'Criollitos VE' });
  const co = group({ uuid: 'co', name: 'Criollitos CO' });

  it('filtra por nombre sin distinguir mayúsculas', () => {
    expect(filterFundCandidates([ve, co], 've')).toEqual([ve]);
  });

  it('sin texto, devuelve todo tal cual', () => {
    expect(filterFundCandidates([ve, co], '  ')).toEqual([ve, co]);
  });
});
