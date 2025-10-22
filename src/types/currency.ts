import { PairType } from "./admin";

export enum Currency {
  VES = "VES",
  COP = "COP",
  BRL = "BRL",
  USDT = "USDT",
  ZELLE = "ZELLE",
  PAYPAL = "PAYPAL",
}

export interface Rate {
  key: string;
  uuid: string;
  from_currency: Currency;
  to_currency: Currency;
  rate: number;
  type: string;
  inverse_percentage: boolean;
  is_manual?: boolean;
  manual_rate?: number | null;
  automatic_rate?: number | null;
  currency_pair_uuid: string;  
  pair_symbol?: string;
  pair_type: PairType;
}

export interface CurrencyData {
  uuid: string;
  name: string;
  symbol: string;
  description?: string;
  currency_type: 'fiat' | 'crypto' | 'stablecoin' | 'digital_wallet';
  created_at: string;
  updated_at?: string;
}

export interface CurrencyPairData {
  uuid: string;
  pair_symbol: string;
  pair_type: 'base' | 'derived' | 'cross';
  from_currency_uuid: string;
  to_currency_uuid: string;
  from_currency?: CurrencyData;
  to_currency?: CurrencyData;
  display_name: string;
  is_active: boolean;
  is_monitored: boolean;
  binance_tracked: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ExchangeRateResponse {
  uuid: string;
  currency_pair_uuid: string;
  pair_symbol: string;
  pair_type: 'base' | 'derived' | 'cross';
  from_currency: string;
  to_currency: string;
  rate: number;
  source: string;
  is_active: boolean;
  percentage: number | null;
  inverse_percentage: boolean;
  created_at: string;
  updated_at: string | null;
  manual_rate: number | null;
  is_manual: boolean;
  automatic_rate: number | null;
}

export interface CurrencyConfig {
  [key: string]: {
    name: string;
    symbol: string;
    color: string;
    textColor: string;
  };
}

export interface IconProps {
  className: string;
  spinning?: boolean;
}