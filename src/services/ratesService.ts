import { ApiResponse } from '@/types/auth';
import { ExchangeRateResponse } from '@/types/currency';
import { httpClient } from '@/utils/httpInterceptor';

export class RatesService {
  async getAllActiveRates(): Promise<ApiResponse<ExchangeRateResponse[]>> {
    const result = await httpClient.get<ExchangeRateResponse[]>('/rates');
    return { success: result.success, data: result.data, error: result.error };
  }

  async getRateByUuid(rateUuid: string): Promise<ApiResponse<ExchangeRateResponse>> {
    const result = await httpClient.get<ExchangeRateResponse>(`/rates/${rateUuid}`);
    return { success: result.success, data: result.data, error: result.error };
  }

  async getRateByPair(currencyPairUuid: string): Promise<ApiResponse<ExchangeRateResponse>> {
    const result = await httpClient.get<ExchangeRateResponse>(`/rates/by-pair/${currencyPairUuid}`);
    return { success: result.success, data: result.data, error: result.error };
  }

  async getLatestRatesByPair(
    currencyPairUuid: string,
    limit: number = 10
  ): Promise<ApiResponse<ExchangeRateResponse[]>> {
    const params = new URLSearchParams({ limit: limit.toString() });
    const result = await httpClient.get<ExchangeRateResponse[]>(
      `/rates/latest/${currencyPairUuid}?${params}`
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  async getHistoricalRate(
    pairUuid: string,
    at: string
  ): Promise<ApiResponse<ExchangeRateResponse>> {
    const params = new URLSearchParams({ at });
    const result = await httpClient.get<ExchangeRateResponse>(
      `/rates/historical/${pairUuid}?${params}`
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  createPairSymbol(fromCurrency: string, toCurrency: string): string {
    return `${fromCurrency.toUpperCase()}-${toCurrency.toUpperCase()}`;
  }

  formatRateDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}

export const ratesService = new RatesService();
