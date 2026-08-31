export enum CurrencyType {
  CRYPTO = 'CRYPTO',
  FIAT = 'FIAT'
}

export enum PairType {
  BASE = 'BASE',
  DERIVED = 'DERIVED',
  CROSS = 'CROSS'
}

export interface CurrencyData {
  uuid: string;
  name: string;
  symbol: string;
  description: string;
  currency_type: CurrencyType;
  created_at: string;
  updated_at: string;
}

export interface CreateCurrencyData {
  name: string;
  symbol: string;
  description: string;
  currency_type: CurrencyType;
}

export interface UpdateCurrencyData extends Partial<CreateCurrencyData> {
  id: number;
}

export interface CurrencyAdminResponse {
  currencies: CurrencyData[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

/**
 * Tasa vigente que el backend embebe en el listado y el detalle de pares
 * (`CurrencyPairRateInfo`). Es `null` cuando el par nunca cotizó.
 */
export interface CurrencyPairRateInfo {
  rate: number;
  is_manual: boolean;
  automatic_rate: number | null;
  /** Cuándo se leyó la tasa: cada corrida del monitor inserta una fila nueva. */
  read_at: string;
  rate_24h_ago: number | null;
  change_24h_percentage: number | null;
}

export interface CurrencyPairData {
  uuid: string;
  pair_symbol: string;
  from_currency_uuid: string;
  to_currency_uuid: string;
  base_pair_uuid?: string;
  derived_percentage: number | null;
  use_inverse_percentage: boolean;
  from_currency: CurrencyData;
  to_currency: CurrencyData;
  base_pair: CurrencyPairData | null;
  display_name: string;
  description: string;
  is_active: boolean;
  is_monitored: boolean;
  binance_tracked: boolean;
  banks_to_track: string[] | null;
  amount_to_track: number | null;
  pair_type: PairType;
  usdt_reference_side?: 'FROM' | 'TO' | null;
  usdt_manual_rate?: number | null;
  usdt_pair_uuid?: string | null;
  usdt_pair_symbol?: string | null;
  usdt_pair_inverse?: boolean;
  rounding_mode?: 'RATE' | 'AMOUNT' | null;
  rounding_step?: number | null;
  rounding_direction?: 'UP' | 'DOWN' | null;
  rounding_amount_side?: 'FROM' | 'TO' | null;
  /**
   * En qué cifras se habla con el cliente en este par. NO lo aplica nadie
   * automáticamente —a diferencia de `rounding_step`, que el bot aplica en cada
   * cotización—: solo alimenta las sugerencias de monto redondo al crear una
   * cotización a mano. Por eso pueden ser distintos.
   */
  negotiation_step?: number | null;
  /** En qué moneda del par está expresado `negotiation_step`. */
  negotiation_step_side?: 'FROM' | 'TO' | null;
  /** Solo la llenan el listado y el detalle; en otros endpoints llega `null`. */
  current_rate?: CurrencyPairRateInfo | null;
  created_at: string;
  updated_at?: string;
}

export interface CreateCurrencyPairData {
  from_currency_uuid: string;
  to_currency_uuid: string;
  base_pair_uuid?: string;
  derived_percentage?: number | null;
  use_inverse_percentage?: boolean;
  description: string;
  is_active?: boolean;
  is_monitored?: boolean;
  binance_tracked?: boolean;
  banks_to_track?: string[] | null;
  amount_to_track?: number | null;
  pair_type?: PairType;
  usdt_reference_side?: 'FROM' | 'TO' | null;
  usdt_manual_rate?: number | null;
  usdt_pair_uuid?: string | null;
  usdt_pair_inverse?: boolean;
  rounding_mode?: 'RATE' | 'AMOUNT' | null;
  rounding_step?: number | null;
  rounding_direction?: 'UP' | 'DOWN' | null;
  rounding_amount_side?: 'FROM' | 'TO' | null;
  negotiation_step?: number | null;
  negotiation_step_side?: 'FROM' | 'TO' | null;
}

export interface UpdateCurrencyPairData {
  base_pair_uuid?: string | null;
  derived_percentage?: number | null;
  use_inverse_percentage?: boolean;
  description?: string;
  is_active?: boolean;
  is_monitored?: boolean;
  binance_tracked?: boolean;
  banks_to_track?: string[] | null;
  amount_to_track?: number | null;
  pair_type?: PairType;
  usdt_reference_side?: 'FROM' | 'TO' | null;
  usdt_manual_rate?: number | null;
  usdt_pair_uuid?: string | null;
  usdt_pair_inverse?: boolean;
  rounding_mode?: 'RATE' | 'AMOUNT' | null;
  rounding_step?: number | null;
  rounding_direction?: 'UP' | 'DOWN' | null;
  rounding_amount_side?: 'FROM' | 'TO' | null;
  negotiation_step?: number | null;
  negotiation_step_side?: 'FROM' | 'TO' | null;
}

export interface CurrencyPairStatusData {
  is_active: boolean;
  is_monitored: boolean;
  binance_tracked?: boolean;
  banks_to_track?: string[] | null;
  amount_to_track?: number | null;
}

export interface CurrencyPairsResponse {
  pairs: CurrencyPairData[];
  total: number;
  skip: number;
  limit: number;
}

export interface CurrencyPairStatsResponse {
  total_pairs: number;
  active_pairs: number;
  monitored_pairs: number;
  pairs_by_currency: Record<string, number>;
}

export interface BinanceTradeMethod {
  identifier: string;
  icon_url: string;
  name?: string;
  short_name?: string;
  bg_color?: string;
}

export interface BinanceTradeMethodsResponse {
  fiat_currency: string;
  trade_methods: BinanceTradeMethod[];
}

export interface BinanceFilterConditionsResponse {
  fiat_currency: string;
  trade_methods: BinanceTradeMethod[];
}

export interface BasePairData {
  uuid: string;
  pair_symbol: string;
  from_currency_uuid: string;
  to_currency_uuid: string;
  derived_percentage: null;
  use_inverse_percentage: boolean;
  from_currency: CurrencyData;
  to_currency: CurrencyData;
  base_pair: null;
  display_name: string;
  description: string;
  is_active: boolean;
  is_monitored: boolean;
  binance_tracked: boolean;
  is_manual: boolean;
  banks_to_track: string[] | null;
  amount_to_track: number | null;
  pair_type: PairType;
  /** El endpoint de base-pairs la incluye para mostrar a cuánto cotiza el base. */
  current_rate?: CurrencyPairRateInfo | null;
  created_at: string;
  updated_at?: string;
}

export interface DerivedPairData {
  id: number;
  pair_symbol: string;
  base_pair_id: number;
  derived_percentage: number;
  use_inverse_percentage: boolean;
  display_name: string;
  is_active: boolean;
  pair_type: PairType;
}