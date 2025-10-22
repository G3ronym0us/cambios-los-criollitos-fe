import {
  CommissionConfiguration,
  CommissionConfigCreate,
  CommissionConfigUpdate,
  CommissionConfigListByPair,
  CommissionConfigFilters
} from '@/types/commissionConfig';
import { ApiResponse } from '@/types/auth';
import { httpClient } from '@/utils/httpInterceptor';

export class CommissionConfigService {
  // Create configuration
  async createConfig(data: CommissionConfigCreate): Promise<ApiResponse<CommissionConfiguration>> {
    const result = await httpClient.post<CommissionConfiguration>('/commission-configs', data);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  // Get configurations by pair UUID
  async getConfigsByPair(currencyPairUuid: string, onlyActive: boolean = true): Promise<ApiResponse<CommissionConfigListByPair>> {
    const params = new URLSearchParams();
    if (onlyActive) params.append('only_active', 'true');

    const endpoint = `/commission-configs/pairs/${currencyPairUuid}?${params.toString()}`;
    const result = await httpClient.get<CommissionConfigListByPair>(endpoint);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  // Get available pairs with configurations
  async getAvailablePairs(): Promise<ApiResponse<string[]>> {
    const result = await httpClient.get<string[]>('/commission-configs/pairs');
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  // List all configurations (with filters)
  async getAllConfigs(filters: CommissionConfigFilters = {}): Promise<ApiResponse<{ configurations: CommissionConfiguration[], total: number }>> {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.per_page) params.append('per_page', filters.per_page.toString());
    if (filters.currency_pair_uuid) params.append('currency_pair_uuid', filters.currency_pair_uuid);
    if (filters.only_active !== undefined) params.append('only_active', filters.only_active.toString());

    const queryString = params.toString();
    const endpoint = queryString ? `/commission-configs?${queryString}` : '/commission-configs';

    const result = await httpClient.get<{ configurations: CommissionConfiguration[], total: number }>(endpoint);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  // Get configuration by UUID
  async getConfigById(configUuid: string): Promise<ApiResponse<CommissionConfiguration>> {
    const result = await httpClient.get<CommissionConfiguration>(`/commission-configs/${configUuid}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  // Update configuration
  async updateConfig(configUuid: string, data: CommissionConfigUpdate): Promise<ApiResponse<CommissionConfiguration>> {
    const result = await httpClient.put<CommissionConfiguration>(`/commission-configs/${configUuid}`, data);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  // Delete configuration
  async deleteConfig(configUuid: string, softDelete: boolean = true): Promise<ApiResponse<void>> {
    const params = new URLSearchParams();
    if (softDelete) params.append('soft_delete', 'true');

    const endpoint = `/commission-configs/${configUuid}?${params.toString()}`;
    const result = await httpClient.delete<void>(endpoint);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }
}

export const commissionConfigService = new CommissionConfigService();
