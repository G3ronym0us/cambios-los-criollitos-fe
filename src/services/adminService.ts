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
  BasePairData,
  DerivedPairData
} from '@/types/admin';
import { ApiResponse } from '@/types/auth';
import { ExchangeRateResponse } from '@/types/currency';
import { httpClient } from '@/utils/httpInterceptor';

export class AdminService {

  async getCurrencies(page: number = 1, per_page: number = 10): Promise<ApiResponse<CurrencyAdminResponse>> {
    console.log('[AdminService.getCurrencies] Called with page:', page, 'per_page:', per_page);
    console.log('[AdminService.getCurrencies] httpClient instance:', httpClient);
    const endpoint = `/currencies?page=${page}&per_page=${per_page}`;
    console.log('[AdminService.getCurrencies] Endpoint:', endpoint);
    const result = await httpClient.get<CurrencyAdminResponse>(endpoint);
    console.log('[AdminService.getCurrencies] Result:', result);
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

  async updateCurrency(uuid: string, currencyData: Partial<CreateCurrencyData>): Promise<ApiResponse<CurrencyData>> {
    const result = await httpClient.put<CurrencyData>(`/currencies/${uuid}`, currencyData);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  async deleteCurrency(uuid: string): Promise<ApiResponse<void>> {
    const result = await httpClient.delete(`/currencies/${uuid}`);
    return {
      success: result.success,
      error: result.error
    };
  }

  async toggleCurrencyStatus(uuid: string): Promise<ApiResponse<CurrencyData>> {
    const result = await httpClient.patch<CurrencyData>(`/currencies/${uuid}/toggle-status`);
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

  async updateCurrencyPair(uuid: string, pairData: UpdateCurrencyPairData): Promise<ApiResponse<CurrencyPairData>> {
    const result = await httpClient.put<CurrencyPairData>(`/currency-pairs/${uuid}`, pairData);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  async updateCurrencyPairStatus(uuid: string, statusData: CurrencyPairStatusData): Promise<ApiResponse<CurrencyPairData>> {
    const result = await httpClient.patch<CurrencyPairData>(`/currency-pairs/${uuid}/status`, statusData);
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

  async deleteCurrencyPair(uuid: string): Promise<ApiResponse<void>> {
    const result = await httpClient.delete(`/currency-pairs/${uuid}`);
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

  async getBasePairs(): Promise<ApiResponse<BasePairData[]>> {
    const result = await httpClient.get<BasePairData[]>('/currency-pairs/base-pairs');
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  async getDerivedPairs(basePairId: number): Promise<ApiResponse<DerivedPairData[]>> {
    const result = await httpClient.get<DerivedPairData[]>(`/currency-pairs/${basePairId}/derived`);
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
  async setManualRate(currencyPairUuid: string, manualRate: number): Promise<ApiResponse<ExchangeRateResponse>> {
    const result = await httpClient.post<ExchangeRateResponse>('/rates/manual', {
      currency_pair_uuid: currencyPairUuid,
      manual_rate: manualRate
    });
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  async disableManualRate(currencyPairUuid: string): Promise<ApiResponse<ExchangeRateResponse>> {
    const result = await httpClient.put<ExchangeRateResponse>(`/rates/manual/${currencyPairUuid}/disable`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }
}

export const adminService = new AdminService();