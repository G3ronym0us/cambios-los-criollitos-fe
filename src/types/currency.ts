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