export enum CurrencyType {
  CRYPTO = 'CRYPTO',
  FIAT = 'FIAT'
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