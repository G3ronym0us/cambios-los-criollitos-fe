import { describe, expect, it } from 'vitest';
import { PairType, type CurrencyPairData, type CurrencyPairRateInfo } from '@/types/admin';
import {
  derivedPercentageLabel,
  formatAge,
  getPairHealth,
  rateOrigin,
  sortPairsByAlert,
} from './pairHealth';
import { filterPairs, summarizePairs, emptyPairFilters } from './pairFilters';

const NOW = new Date('2026-08-06T12:00:00Z').getTime();
const minutesAgo = (n: number) => new Date(NOW - n * 60_000).toISOString();

function makeRate(overrides: Partial<CurrencyPairRateInfo> = {}): CurrencyPairRateInfo {
  return {
    rate: 244.5,
    is_manual: false,
    automatic_rate: null,
    read_at: minutesAgo(2),
    rate_24h_ago: 243.5,
    change_24h_percentage: 0.41,
    ...overrides,
  };
}

function makePair(overrides: Partial<CurrencyPairData> = {}): CurrencyPairData {
  return {
    uuid: 'u1',
    pair_symbol: 'VES-USDT',
    from_currency_uuid: 'c1',
    to_currency_uuid: 'c2',
    derived_percentage: null,
    use_inverse_percentage: false,
    from_currency: {
      uuid: 'c1',
      name: 'Bolívar',
      symbol: 'VES',
      description: '',
      currency_type: 'FIAT',
      created_at: '',
      updated_at: '',
    } as CurrencyPairData['from_currency'],
    to_currency: {
      uuid: 'c2',
      name: 'Tether',
      symbol: 'USDT',
      description: '',
      currency_type: 'CRYPTO',
      created_at: '',
      updated_at: '',
    } as CurrencyPairData['to_currency'],
    base_pair: null,
    display_name: 'VES/USDT',
    description: 'Bolívar a Tether',
    is_active: true,
    is_monitored: true,
    binance_tracked: true,
    banks_to_track: ['PagoMovil', 'Banesco', 'Mercantil'],
    amount_to_track: 100,
    pair_type: PairType.BASE,
    current_rate: makeRate(),
    created_at: '',
    ...overrides,
  };
}

describe('getPairHealth', () => {
  it('marca al día un par monitoreado leído hace poco', () => {
    expect(getPairHealth(makePair(), NOW)).toBe('ok');
  });

  it('marca tasa vieja cuando el monitor no lo relee hace más de 30 min', () => {
    const pair = makePair({ current_rate: makeRate({ read_at: minutesAgo(240) }) });
    expect(getPairHealth(pair, NOW)).toBe('stale');
  });

  it('no envejece un par que nadie monitorea', () => {
    const pair = makePair({
      is_monitored: false,
      current_rate: makeRate({ read_at: minutesAgo(240) }),
    });
    expect(getPairHealth(pair, NOW)).toBe('ok');
  });

  it('marca sin tasa el par que nunca cotizó', () => {
    expect(getPairHealth(makePair({ current_rate: null }), NOW)).toBe('missing');
  });

  it('apaga los pares inactivos para que no cuenten como alerta', () => {
    const pair = makePair({ is_active: false, current_rate: null });
    expect(getPairHealth(pair, NOW)).toBe('off');
  });
});

describe('sortPairsByAlert', () => {
  it('pone primero lo roto, después lo viejo y al final lo inactivo', () => {
    const ok = makePair({ uuid: 'ok', display_name: 'AAA/USDT' });
    const stale = makePair({
      uuid: 'stale',
      display_name: 'ZZZ/USDT',
      current_rate: makeRate({ read_at: minutesAgo(240) }),
    });
    const missing = makePair({ uuid: 'missing', display_name: 'MMM/USDT', current_rate: null });
    const off = makePair({ uuid: 'off', display_name: 'BBB/USDT', is_active: false });

    const sorted = sortPairsByAlert([ok, off, stale, missing], NOW);
    expect(sorted.map((p) => p.uuid)).toEqual(['missing', 'stale', 'ok', 'off']);
  });
});

describe('rateOrigin', () => {
  it('cuenta los métodos de Binance de un par base', () => {
    expect(rateOrigin(makePair()).label).toBe('Binance · 3 métodos');
  });

  it('nombra el par base del que deriva', () => {
    const pair = makePair({
      pair_type: PairType.DERIVED,
      binance_tracked: false,
      base_pair: makePair({ display_name: 'VES/USDT' }),
    });
    expect(rateOrigin(pair)).toEqual({ kind: 'derived', label: 'Deriva de VES/USDT' });
  });

  it('describe el cruce con sus dos patas contra USDT', () => {
    const pair = makePair({
      pair_type: PairType.CROSS,
      binance_tracked: false,
      to_currency: { ...makePair().to_currency, symbol: 'COP' },
    });
    expect(rateOrigin(pair)).toEqual({ kind: 'cross', label: 'VES/USDT ÷ USDT/COP' });
  });

  it('muestra la automática junto al precio manual', () => {
    const pair = makePair({
      current_rate: makeRate({ is_manual: true, rate: 262, automatic_rate: 257.9475 }),
    });
    expect(rateOrigin(pair).label).toBe('Manual · auto 257,9475');
  });
});

describe('derivedPercentageLabel', () => {
  it('no le inventa signo al porcentaje inverso, que sube la tasa en vez de bajarla', () => {
    const pair = makePair({ derived_percentage: 3, use_inverse_percentage: true });
    expect(derivedPercentageLabel(pair)).toBe('3,00 % inv');
  });

  it('formatea el porcentaje normal', () => {
    const pair = makePair({ derived_percentage: 5.5, use_inverse_percentage: false });
    expect(derivedPercentageLabel(pair)).toBe('5,50 %');
  });
});

describe('formatAge', () => {
  it('usa minutos, horas y días según la distancia', () => {
    expect(formatAge(minutesAgo(2), NOW)).toBe('hace 2 min');
    expect(formatAge(minutesAgo(240), NOW)).toBe('hace 4 h');
    expect(formatAge(minutesAgo(60 * 24 * 24), NOW)).toBe('hace 24 días');
  });
});

describe('filterPairs', () => {
  const pairs = [
    makePair({ uuid: 'ok', display_name: 'VES/USDT' }),
    makePair({ uuid: 'missing', display_name: 'COP/BRL', current_rate: null }),
    makePair({ uuid: 'off', display_name: 'BRL/COP', is_active: false }),
  ];

  it('el segmento «con alerta» deja solo lo que hay que atender', () => {
    const result = filterPairs(pairs, { ...emptyPairFilters, segment: 'alert' }, NOW);
    expect(result.map((p) => p.uuid)).toEqual(['missing']);
  });

  it('el segmento «activos» esconde los apagados', () => {
    const result = filterPairs(pairs, { ...emptyPairFilters, segment: 'active' }, NOW);
    expect(result.map((p) => p.uuid).sort()).toEqual(['missing', 'ok']);
  });

  it('busca por nombre además de por símbolo', () => {
    const result = filterPairs(pairs, { ...emptyPairFilters, search: 'tether' }, NOW);
    expect(result).toHaveLength(3);
  });
});

describe('summarizePairs', () => {
  it('cuenta alertas y precios manuales sobre el listado completo', () => {
    const summary = summarizePairs(
      [
        makePair({ uuid: 'ok' }),
        makePair({ uuid: 'stale', current_rate: makeRate({ read_at: minutesAgo(240) }) }),
        makePair({ uuid: 'missing', current_rate: null }),
        makePair({
          uuid: 'manual',
          current_rate: makeRate({ is_manual: true, rate: 262, automatic_rate: 257.9475 }),
        }),
      ],
      NOW
    );

    expect(summary.alerts).toBe(2);
    expect(summary.stale).toBe(1);
    expect(summary.missing).toBe(1);
    expect(summary.manual).toBe(1);
    expect(summary.largestManualDeviation).toBeCloseTo(1.5707, 3);
  });

  it('no cuenta como alerta un par inactivo sin tasa', () => {
    const summary = summarizePairs([makePair({ is_active: false, current_rate: null })], NOW);
    expect(summary.alerts).toBe(0);
  });
});
