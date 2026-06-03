import { ApiResponse } from '@/types/auth';
import { httpClient } from '@/utils/httpInterceptor';
import { PaymentData, PaymentTable } from '@/types/payment';

export class PaymentService {
  // Lista pagos entrantes o salientes del bot. Requiere operador autenticado (JWT).
  async getPayments(table: PaymentTable, limit = 300): Promise<ApiResponse<PaymentData[]>> {
    const result = await httpClient.get<PaymentData[]>(`/payments/${table}?limit=${limit}`);
    return { success: result.success, data: result.data, error: result.error };
  }

  // Vincula (operationUuid) o desvincula (null) un pago a una operación.
  async linkOperation(
    table: PaymentTable,
    paymentId: number,
    operationUuid: string | null,
  ): Promise<ApiResponse<PaymentData>> {
    const result = await httpClient.patch<PaymentData>(
      `/payments/${table}/${paymentId}/operation`,
      { operation_uuid: operationUuid },
    );
    return { success: result.success, data: result.data, error: result.error };
  }
}

export const paymentService = new PaymentService();
