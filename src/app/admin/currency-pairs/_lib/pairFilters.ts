import { PairType, type CurrencyPairData } from '@/types/admin';
import { hasAlert, isManualPrice, normalizePairType, sortPairsByAlert } from './pairHealth';

/**
 * Segmento de estado del listado. Reemplaza los switches «solo activos / solo
 * monitoreados»: con 22 pares, lo que se busca a diario es lo que está roto.
 */
export type PairSegment = 'alert' | 'active' | 'all';

export interface PairFilters {
  search: string;
  segment: PairSegment;
  types: PairType[];
  currency: string;
}

export const emptyPairFilters: PairFilters = {
  search: '',
  segment: 'all',
  types: [],
  currency: '',
};

export function hasActivePairFilters(filters: PairFilters): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.segment !== 'all' ||
    filters.types.length > 0 ||
    filters.currency !== ''
  );
}

function matchesSearch(pair: CurrencyPairData, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  const haystack = [
    pair.display_name,
    pair.pair_symbol,
    pair.description,
    pair.from_currency.symbol,
    pair.from_currency.name,
    pair.to_currency.symbol,
    pair.to_currency.name,
  ];
  return haystack.some((value) => value?.toLowerCase().includes(term));
}

export function filterPairs(
  pairs: CurrencyPairData[],
  filters: PairFilters,
  now: number = Date.now()
): CurrencyPairData[] {
  const currency = filters.currency.toUpperCase();

  const filtered = pairs.filter((pair) => {
    if (filters.segment === 'alert' && !hasAlert(pair, now)) return false;
    if (filters.segment === 'active' && !pair.is_active) return false;

    if (filters.types.length > 0 && !filters.types.includes(normalizePairType(pair.pair_type))) {
      return false;
    }

    if (
      currency &&
      pair.from_currency.symbol.toUpperCase() !== currency &&
      pair.to_currency.symbol.toUpperCase() !== currency
    ) {
      return false;
    }

    return matchesSearch(pair, filters.search);
  });

  return sortPairsByAlert(filtered, now);
}

export interface PairsSummary {
  alerts: number;
  stale: number;
  missing: number;
  manual: number;
  /** Mayor desviación entre un precio manual y su automático, en porcentaje. */
  largestManualDeviation: number | null;
  active: number;
  total: number;
  monitored: number;
  binance: number;
  /** Lectura más reciente entre todos los pares monitoreados. */
  lastReadAt: string | null;
}

/**
 * Las cifras de la cabecera se calculan sobre el listado completo (sin filtros):
 * son el estado del sistema, no el de la vista.
 */
export function summarizePairs(pairs: CurrencyPairData[], now: number = Date.now()): PairsSummary {
  let stale = 0;
  let missing = 0;
  let manual = 0;
  let largestManualDeviation: number | null = null;
  let active = 0;
  let monitored = 0;
  let binance = 0;
  let lastReadAt: string | null = null;

  for (const pair of pairs) {
    if (pair.is_active) active += 1;
    if (pair.is_monitored) monitored += 1;
    if (pair.binance_tracked) binance += 1;

    if (pair.is_active && hasAlert(pair, now)) {
      if (pair.current_rate) stale += 1;
      else missing += 1;
    }

    if (isManualPrice(pair)) {
      manual += 1;
      const rate = pair.current_rate;
      if (rate?.automatic_rate) {
        const deviation = ((rate.rate - rate.automatic_rate) / rate.automatic_rate) * 100;
        if (
          largestManualDeviation === null ||
          Math.abs(deviation) > Math.abs(largestManualDeviation)
        ) {
          largestManualDeviation = deviation;
        }
      }
    }

    const readAt = pair.current_rate?.read_at;
    if (readAt && (!lastReadAt || new Date(readAt) > new Date(lastReadAt))) {
      lastReadAt = readAt;
    }
  }

  return {
    alerts: stale + missing,
    stale,
    missing,
    manual,
    largestManualDeviation,
    active,
    total: pairs.length,
    monitored,
    binance,
    lastReadAt,
  };
}
