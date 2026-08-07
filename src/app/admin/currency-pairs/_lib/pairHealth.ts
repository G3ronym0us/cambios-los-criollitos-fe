import { PairType, type CurrencyPairData } from '@/types/admin';

/**
 * Salud de la tasa de un par. Es lo que ordena el listado y lo que pinta la
 * barra de color de la fila.
 *
 * - `ok`      — hay tasa y es reciente. No lleva color: lo normal no grita.
 * - `stale`   — el par está monitoreado y no se relee desde hace rato (ámbar).
 * - `missing` — nunca cotizó (rojo): el par no puede vender.
 * - `off`     — inactivo. No cuenta para alertas.
 */
export type PairHealth = 'ok' | 'stale' | 'missing' | 'off';

/** Sin lectura por más de este tiempo, un par monitoreado se marca en ámbar. */
export const STALE_AFTER_MS = 30 * 60 * 1000;

export function getPairHealth(pair: CurrencyPairData, now: number = Date.now()): PairHealth {
  if (!pair.is_active) return 'off';
  if (!pair.current_rate) return 'missing';
  // Solo los pares monitoreados envejecen: si nadie los relee, no hay nada que avisar.
  if (!pair.is_monitored) return 'ok';

  const readAt = new Date(pair.current_rate.read_at).getTime();
  if (!Number.isFinite(readAt)) return 'ok';
  return now - readAt > STALE_AFTER_MS ? 'stale' : 'ok';
}

export function hasAlert(pair: CurrencyPairData, now: number = Date.now()): boolean {
  const health = getPairHealth(pair, now);
  return health === 'stale' || health === 'missing';
}

/** Un precio manual nunca es alerta, pero siempre se ve. */
export function isManualPrice(pair: CurrencyPairData): boolean {
  return pair.current_rate?.is_manual === true;
}

/**
 * Desviación del precio manual frente al automático, en porcentaje.
 * `null` si no hay manual o si no se guardó la automática con la que comparar.
 */
export function manualDeviation(pair: CurrencyPairData): number | null {
  const rate = pair.current_rate;
  if (!rate?.is_manual || !rate.automatic_rate) return null;
  return ((rate.rate - rate.automatic_rate) / rate.automatic_rate) * 100;
}

export function normalizePairType(pairType: PairType | string): PairType {
  const normalized = String(pairType).toUpperCase();
  if (normalized === PairType.DERIVED) return PairType.DERIVED;
  if (normalized === PairType.CROSS) return PairType.CROSS;
  return PairType.BASE;
}

export const PAIR_TYPE_LABEL: Record<PairType, string> = {
  [PairType.BASE]: 'Base',
  [PairType.DERIVED]: 'Derivado',
  [PairType.CROSS]: 'Cruzado',
};

/**
 * De dónde sale la tasa del par, en una línea.
 *
 * Un par cruzado se calcula con las dos patas contra USDT
 * (`from/USDT ÷ USDT/to`, ver `binance_scraper._calculate_cross_rates`), no con
 * la config `usdt_reference_side`, que es para los movimientos de fondos.
 */
export function rateOrigin(pair: CurrencyPairData): {
  kind: 'manual' | 'binance' | 'derived' | 'cross' | 'stale' | 'none';
  label: string;
} {
  if (!pair.current_rate && pair.is_active) {
    return { kind: 'none', label: 'Sin configurar' };
  }

  if (isManualPrice(pair)) {
    const auto = pair.current_rate?.automatic_rate;
    return {
      kind: 'manual',
      label: auto ? `Manual · auto ${formatRate(auto)}` : 'Manual',
    };
  }

  const type = normalizePairType(pair.pair_type);

  if (type === PairType.DERIVED && pair.base_pair) {
    return { kind: 'derived', label: `Deriva de ${pair.base_pair.display_name}` };
  }

  if (type === PairType.CROSS) {
    const from = pair.from_currency.symbol;
    const to = pair.to_currency.symbol;
    return { kind: 'cross', label: `${from}/USDT ÷ USDT/${to}` };
  }

  if (pair.binance_tracked) {
    const count = pair.banks_to_track?.length ?? 0;
    return {
      kind: 'binance',
      label: count === 1 ? 'Binance · 1 método' : `Binance · ${count} métodos`,
    };
  }

  return { kind: 'none', label: 'Sin origen automático' };
}

/**
 * Chip del porcentaje derivado: `5,50 %` / `3,00 % inv`.
 *
 * Sin signo a propósito: `inv` no significa «resta». Según
 * `ExchangeRate.create_safe`, el normal multiplica por `(1 − pct)` —baja la
 * tasa— y el inverso divide entre `(1 − pct)` —la sube—, así que un `−` delante
 * del inverso diría lo contrario de lo que hace.
 */
export function derivedPercentageLabel(pair: CurrencyPairData): string | null {
  if (pair.derived_percentage == null) return null;
  const pct = Number(pair.derived_percentage);
  if (!Number.isFinite(pct) || pct === 0) return null;
  const formatted = pct.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} %${pair.use_inverse_percentage ? ' inv' : ''}`;
}

/** Tasas grandes y chicas necesitan distinta precisión para leerse igual. */
export function formatRate(rate: number): string {
  const decimals = Math.abs(rate) >= 1000 ? 2 : Math.abs(rate) >= 1 ? 4 : 6;
  return rate.toLocaleString('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercentage(pct: number): string {
  const formatted = Math.abs(pct).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : '';
  return `${sign}${formatted} %`;
}

/** "hace 2 min", "hace 4 h", "hace 24 días". */
export function formatAge(isoDate: string, now: number = Date.now()): string {
  const then = new Date(isoDate).getTime();
  if (!Number.isFinite(then)) return '—';

  const minutes = Math.max(0, Math.round((now - then) / 60000));
  if (minutes < 1) return 'recién';
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;

  const days = Math.round(hours / 24);
  return days === 1 ? 'hace 1 día' : `hace ${days} días`;
}

/**
 * Orden del listado: primero lo que tiene alerta, luego el resto, y los
 * inactivos al final. Dentro de cada grupo, alfabético por símbolo.
 */
const HEALTH_ORDER: Record<PairHealth, number> = {
  missing: 0,
  stale: 1,
  ok: 2,
  off: 3,
};

export function sortPairsByAlert(
  pairs: CurrencyPairData[],
  now: number = Date.now()
): CurrencyPairData[] {
  return [...pairs].sort((a, b) => {
    const diff = HEALTH_ORDER[getPairHealth(a, now)] - HEALTH_ORDER[getPairHealth(b, now)];
    if (diff !== 0) return diff;
    return a.display_name.localeCompare(b.display_name, 'es');
  });
}
