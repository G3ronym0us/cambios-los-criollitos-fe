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
  id: number;
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

export interface CurrencyPairData {
  id: number;
  pair_symbol: string;
  from_currency_id: number;
  to_currency_id: number;
  base_pair_id: number | null;
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
  created_at: string;
  updated_at?: string;
}

export interface CreateCurrencyPairData {
  from_currency_id: number;
  to_currency_id: number;
  base_pair_id?: number | null;
  derived_percentage?: number | null;
  use_inverse_percentage?: boolean;
  description: string;
  is_active?: boolean;
  is_monitored?: boolean;
  binance_tracked?: boolean;
  banks_to_track?: string[] | null;
  amount_to_track?: number | null;
  pair_type?: PairType;
}

export interface UpdateCurrencyPairData {
  base_pair_id?: number | null;
  derived_percentage?: number | null;
  use_inverse_percentage?: boolean;
  description?: string;
  is_active?: boolean;
  is_monitored?: boolean;
  binance_tracked?: boolean;
  banks_to_track?: string[] | null;
  amount_to_track?: number | null;
  pair_type?: PairType;
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

export interface ManualRateData {
  id: number;
  from_currency: string;
  to_currency: string;
  rate: number;
  source: string;
  is_active: boolean;
  percentage: number;
  inverse_percentage: boolean;
  created_at: string;
  updated_at: string;
  manual_rate: number | null;
  is_manual: boolean;
  automatic_rate: number | null;
}

export interface SetManualRateRequest {
  manual_rate: number;
}

export interface BasePairData {
  id: number;
  pair_symbol: string;
  from_currency_id: number;
  to_currency_id: number;
  base_pair_id: null;
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
  banks_to_track: string[] | null;
  amount_to_track: number | null;
  pair_type: PairType;
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