import { ApiResponse } from '@/types/auth';
import { httpClient } from '@/utils/httpInterceptor';
import {
  OperationData,
  OperationFilters,
  OperationListResponse,
  OperationStatus,
  OperationStats,
} from '@/types/operation';
import type { PaymentData } from '@/types/payment';

export interface OperationPayments {
  incoming: PaymentData[];
  outgoing: PaymentData[];
}

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

  // Pagos entrantes y salientes vinculados a la operación (para el detalle).
  async getOperationPayments(uuid: string): Promise<ApiResponse<OperationPayments>> {
    const result = await httpClient.get<OperationPayments>(`/operations/${uuid}/payments`);
    return { success: result.success, data: result.data, error: result.error };
  }

  async updatePair(uuid: string, currencyPairUuid: string): Promise<ApiResponse<OperationData>> {
    const result = await httpClient.patch<OperationData>(`/operations/${uuid}`, {
      currency_pair_uuid: currencyPairUuid,
    });
    return { success: result.success, data: result.data, error: result.error };
  }

  async updateDetails(
    uuid: string,
    data: { currency_pair_uuid?: string; applied_percentage?: number },
  ): Promise<ApiResponse<OperationData>> {
    const result = await httpClient.patch<OperationData>(`/operations/${uuid}`, data);
    return { success: result.success, data: result.data, error: result.error };
  }

  async updateFund(uuid: string, fundGroupUuid: string | null): Promise<ApiResponse<OperationData>> {
    const result = await httpClient.patch<OperationData>(`/operations/${uuid}`, fundGroupUuid
      ? { fund_group_uuid: fundGroupUuid }
      : { clear_fund_group: true });
    return { success: result.success, data: result.data, error: result.error };
  }

  async updateStatus(uuid: string, status: OperationStatus): Promise<ApiResponse<OperationData>> {
    const result = await httpClient.patch<OperationData>(`/operations/${uuid}/status`, { status });
    return { success: result.success, data: result.data, error: result.error };
  }

  // Marca como recibidos los USD efectivo de una op con entrega pendiente.
  async markDelivered(uuid: string): Promise<ApiResponse<OperationData>> {
    const result = await httpClient.patch<OperationData>(`/operations/${uuid}/delivered`, {});
    return { success: result.success, data: result.data, error: result.error };
  }

  // Corrección retroactiva de una op COMPLETED: redimensiona al monto realmente
  // cambiado, sincroniza la transacción y acredita el excedente como saldo a favor.
  async partialSettle(
    uuid: string,
    settleAmount: number,
  ): Promise<ApiResponse<{ operation: OperationData; credited: number; balance_after: number }>> {
    const result = await httpClient.post<{ operation: OperationData; credited: number; balance_after: number }>(
      `/operations/${uuid}/partial-settle`,
      { settle_amount: settleAmount },
    );
    return { success: result.success, data: result.data, error: result.error };
  }
}

export const operationService = new OperationService();
