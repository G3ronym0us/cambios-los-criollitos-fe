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
  from_currency: Currency;
  to_currency: Currency;
  rate: number;
  type: string;
  inverse_percentage: boolean;
}

export interface ExchangeRateResponse {
  id: number;
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