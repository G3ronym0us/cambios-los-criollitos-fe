import { 
  CurrencyData, 
  CreateCurrencyData, 
  CurrencyAdminResponse,
  CurrencyPairData,
  CreateCurrencyPairData,
  UpdateCurrencyPairData,
  CurrencyPairStatusData,
  CurrencyPairsResponse,
  CurrencyPairStatsResponse,
  BinanceTradeMethod,
  BinanceTradeMethodsResponse,
  BinanceFilterConditionsResponse,
  ManualRateData
} from '@/types/admin';
import { ApiResponse } from '@/types/auth';
import { httpClient } from '@/utils/httpInterceptor';

export class AdminService {

  async getCurrencies(page: number = 1, per_page: number = 10): Promise<ApiResponse<CurrencyAdminResponse>> {
    const result = await httpClient.get<CurrencyAdminResponse>(`/currencies?page=${page}&per_page=${per_page}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  async createCurrency(currencyData: CreateCurrencyData): Promise<ApiResponse<CurrencyData>> {
    const result = await httpClient.post<CurrencyData>('/currencies', currencyData);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  async updateCurrency(id: number, currencyData: Partial<CreateCurrencyData>): Promise<ApiResponse<CurrencyData>> {
    const result = await httpClient.put<CurrencyData>(`/currencies/${id}`, currencyData);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  async deleteCurrency(id: number): Promise<ApiResponse<void>> {
    const result = await httpClient.delete(`/currencies/${id}`);
    return {
      success: result.success,
      error: result.error
    };
  }

  async toggleCurrencyStatus(id: number): Promise<ApiResponse<CurrencyData>> {
    const result = await httpClient.patch<CurrencyData>(`/currencies/${id}/toggle-status`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  // Currency Pairs Methods
  async getCurrencyPairs(skip: number = 0, limit: number = 100, activeOnly: boolean = false, monitoredOnly: boolean = false): Promise<ApiResponse<CurrencyPairsResponse>> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
      ...(activeOnly && { active_only: 'true' }),
      ...(monitoredOnly && { monitored_only: 'true' })
    });

    const result = await httpClient.get<CurrencyPairsResponse>(`/currency-pairs/?${params}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  async createCurrencyPair(pairData: CreateCurrencyPairData): Promise<ApiResponse<CurrencyPairData>> {
    const result = await httpClient.post<CurrencyPairData>('/currency-pairs/', pairData);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  async updateCurrencyPair(id: number, pairData: UpdateCurrencyPairData): Promise<ApiResponse<CurrencyPairData>> {
    const result = await httpClient.put<CurrencyPairData>(`/currency-pairs/${id}`, pairData);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  async updateCurrencyPairStatus(id: number, statusData: CurrencyPairStatusData): Promise<ApiResponse<CurrencyPairData>> {
    const result = await httpClient.patch<CurrencyPairData>(`/currency-pairs/${id}/status`, statusData);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  async getBinanceTrackedPairs(): Promise<ApiResponse<CurrencyPairData[]>> {
    const result = await httpClient.get<CurrencyPairData[]>('/currency-pairs/binance-tracked');
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  async deleteCurrencyPair(id: number): Promise<ApiResponse<void>> {
    const result = await httpClient.delete(`/currency-pairs/${id}`);
    return {
      success: result.success,
      error: result.error
    };
  }

  async getCurrencyPairStats(): Promise<ApiResponse<CurrencyPairStatsResponse>> {
    const result = await httpClient.get<CurrencyPairStatsResponse>('/currency-pairs/stats');
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  async getMonitoredCurrencyPairs(): Promise<ApiResponse<CurrencyPairData[]>> {
    const result = await httpClient.get<CurrencyPairData[]>('/currency-pairs/monitored');
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  // Binance Trade Methods
  async getBinanceTradeMethodsByUrl(fiatCurrency: string): Promise<ApiResponse<BinanceTradeMethod[]>> {
    const result = await httpClient.get<BinanceTradeMethod[]>(`/binance/trade-methods/${fiatCurrency}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  async getBinanceTradeMethodsByPost(fiatCurrency: string): Promise<ApiResponse<BinanceTradeMethodsResponse>> {
    const result = await httpClient.post<BinanceTradeMethodsResponse>('/binance/trade-methods', { fiat_currency: fiatCurrency });
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  async getBinanceFilterConditions(fiatCurrency: string): Promise<ApiResponse<BinanceFilterConditionsResponse>> {
    const result = await httpClient.post<BinanceFilterConditionsResponse>('/binance/filter-conditions', { fiat_currency: fiatCurrency });
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  // Manual Rate Management Methods
  async setManualRate(fromCurrency: string, toCurrency: string, manualRate: number): Promise<ApiResponse<ManualRateData>> {
    const result = await httpClient.post<ManualRateData>(`/rates/manual/${fromCurrency}/${toCurrency}`, { manual_rate: manualRate });
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  async removeManualRate(fromCurrency: string, toCurrency: string): Promise<ApiResponse<ManualRateData>> {
    const result = await httpClient.delete<ManualRateData>(`/rates/manual/${fromCurrency}/${toCurrency}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }
}