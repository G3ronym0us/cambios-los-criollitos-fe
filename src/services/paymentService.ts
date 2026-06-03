import { ApiResponse } from '@/types/auth';
import { httpClient } from '@/utils/httpInterceptor';
import { PaymentData, PaymentTable } from '@/types/payment';

export class PaymentService {
  // Lista pagos entrantes o salientes del bot. Requiere operador autenticado (JWT).
  async getPayments(table: PaymentTable, limit = 300): Promise<ApiResponse<PaymentData[]>> {
    const result = await httpClient.get<PaymentData[]>(`/payments/${table}?limit=${limit}`);
    return { success: result.success, data: result.data, error: result.error };
  }
}

export const paymentService = new PaymentService();
