import { ApiResponse } from '@/types/auth';
import { httpClient } from '@/utils/httpInterceptor';
import {
  OperationData,
  OperationFilters,
  OperationListResponse,
  OperationStats,
  UpdateScenarioPayload,
} from '@/types/operation';

export class OperationService {
  // Lista operaciones del bot. Requiere operador autenticado (JWT).
  async getOperations(filters: OperationFilters = {}): Promise<ApiResponse<OperationListResponse>> {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.delivery_status) params.append('delivery_status', filters.delivery_status);
    if (filters.phone) params.append('phone', filters.phone);
    if (filters.limit != null) params.append('limit', String(filters.limit));

    const qs = params.toString();
    const result = await httpClient.get<OperationListResponse>(qs ? `/operations?${qs}` : '/operations');
    return { success: result.success, data: result.data, error: result.error };
  }

  async getStats(): Promise<ApiResponse<OperationStats>> {
    const result = await httpClient.get<OperationStats>('/operations/stats');
    return { success: result.success, data: result.data, error: result.error };
  }

  async getOperation(uuid: string): Promise<ApiResponse<OperationData>> {
    const result = await httpClient.get<OperationData>(`/operations/${uuid}`);
    return { success: result.success, data: result.data, error: result.error };
  }

  // Edición manual del escenario/grupo/receptor del entrante de una operación.
  async updateScenario(uuid: string, payload: UpdateScenarioPayload): Promise<ApiResponse<OperationData>> {
    const result = await httpClient.patch<OperationData>(`/operations/${uuid}/scenario`, payload);
    return { success: result.success, data: result.data, error: result.error };
  }
}

export const operationService = new OperationService();
