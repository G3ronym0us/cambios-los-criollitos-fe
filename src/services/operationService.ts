import { ApiResponse } from '@/types/auth';
import { httpClient } from '@/utils/httpInterceptor';
import {
  OperationCoverage,
  UncoveredReason,
  OperationData,
  OperationFilters,
  OperationListResponse,
  OperationRankRequest,
  OperationRankResponse,
  OperationStatus,
  OperationStats,
  ProfitAllocationInput,
  ProfitAllocationList,
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
    if (filters.scenario) params.append('scenario', filters.scenario);
    if (filters.needs) params.append('needs', filters.needs);
    if (filters.phone) params.append('phone', filters.phone);
    if (filters.search) params.append('search', filters.search);
    if (filters.page != null) params.append('page', String(filters.page));
    if (filters.limit != null) params.append('limit', String(filters.limit));

    const qs = params.toString();
    const result = await httpClient.get<OperationListResponse>(qs ? `/operations?${qs}` : '/operations');
    return { success: result.success, data: result.data, error: result.error };
  }

  /**
   * El cajón de "vincular pago" en UN solo viaje: filtra (phone/search/status), puntúa contra
   * el comprobante y ordena/pagina — todo en el servidor. Reemplaza al par
   * `matchForPayment` + `getOperations` (que cruzaban por uuid en el navegador): ahora cada
   * candidata ya viene con su `score` incorporado.
   */
  async rankForPayment(payload: OperationRankRequest): Promise<ApiResponse<OperationRankResponse>> {
    const result = await httpClient.post<OperationRankResponse>('/operations/match', payload);
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

  // Qué cubre ya la operación y con qué comprobantes del cliente podría terminar de cubrirse.
  async getCoverage(uuid: string): Promise<ApiResponse<OperationCoverage>> {
    const result = await httpClient.get<OperationCoverage>(`/operations/${uuid}/coverage`);
    return { success: result.success, data: result.data, error: result.error };
  }

  /**
   * Fija con qué comprobantes se cubre la operación.
   *
   * El monto en la moneda de salida NO viaja: sale de sumar los comprobantes, y de ahí la
   * tasa. `partial` distingue «guardo lo que llevo» de «esto ya está cuadrado»; sólo al
   * cuadrar se deriva la tasa, porque a medias la suma está incompleta.
   */
  async setCoverage(
    uuid: string,
    data: {
      payments: { payment_id: number; settled_amount?: number }[];
      value_amount?: number;
      uncovered?: { amount: number; reason?: UncoveredReason };
      partial?: boolean;
    },
  ): Promise<ApiResponse<OperationCoverage>> {
    const result = await httpClient.put<OperationCoverage>(`/operations/${uuid}/coverage`, data);
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
  async getProfitAllocations(uuid: string): Promise<ApiResponse<ProfitAllocationList>> {
    const result = await httpClient.get<ProfitAllocationList>(
      `/operations/${uuid}/profit-allocations`,
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  async setProfitAllocations(
    uuid: string,
    allocations: ProfitAllocationInput[],
  ): Promise<ApiResponse<ProfitAllocationList>> {
    const result = await httpClient.put<ProfitAllocationList>(
      `/operations/${uuid}/profit-allocations`,
      { allocations },
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  async updateValue(uuid: string, amount: number): Promise<ApiResponse<OperationData>> {
    const result = await httpClient.patch<OperationData>(`/operations/${uuid}/value`, { amount });
    return { success: result.success, data: result.data, error: result.error };
  }

}

export const operationService = new OperationService();
