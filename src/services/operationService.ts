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
    data: { currency_pair_uuid?: string; applied_percentage?: number; client_phone?: string },
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

  // Borra una operación sin comprobantes junto con su transacción y los movimientos que
  // dejó en el fondo. Requiere moderador; falla si aún tiene pagos o movió saldo a favor.
  async deleteOperation(uuid: string): Promise<ApiResponse<unknown>> {
    const result = await httpClient.delete<unknown>(`/operations/${uuid}`);
    return { success: result.success, data: result.data, error: result.error };
  }

  // Marca como recibidos los USD efectivo de una op con entrega pendiente.
  async markDelivered(uuid: string): Promise<ApiResponse<OperationData>> {
    const result = await httpClient.patch<OperationData>(`/operations/${uuid}/delivered`, {});
    return { success: result.success, data: result.data, error: result.error };
  }

  // Corrige cuánto vale el trato (sube y baja).
  async updateValue(uuid: string, amount: number): Promise<ApiResponse<OperationData>> {
    const result = await httpClient.patch<OperationData>(`/operations/${uuid}/value`, { amount });
    return { success: result.success, data: result.data, error: result.error };
  }

}

export const operationService = new OperationService();
