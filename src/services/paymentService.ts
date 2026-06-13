import { ApiResponse } from '@/types/auth';
import { httpClient } from '@/utils/httpInterceptor';
import { PaymentData, PaymentPage, PaymentQuery, PaymentTable } from '@/types/payment';

export class PaymentService {
  // Página de pagos entrantes/salientes (paginada + búsqueda/clasificación server-side).
  async getPayments(table: PaymentTable, query: PaymentQuery = {}): Promise<ApiResponse<PaymentPage>> {
    const sp = new URLSearchParams();
    sp.set('limit', String(query.limit ?? 50));
    sp.set('offset', String(query.offset ?? 0));
    if (query.search) sp.set('search', query.search);
    if (query.outClass && query.outClass !== 'ALL') sp.set('out_class', query.outClass);
    const result = await httpClient.get<PaymentPage>(`/payments/${table}?${sp.toString()}`);
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

  // Marca/desmarca un pago saliente como gasto personal (descripción requerida al marcar).
  async markPersonalExpense(
    paymentId: number,
    isPersonal: boolean,
    description: string | null,
  ): Promise<ApiResponse<PaymentData>> {
    const result = await httpClient.patch<PaymentData>(
      `/payments/outgoing/${paymentId}/personal-expense`,
      { is_personal_expense: isPersonal, personal_description: description },
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  // Marca/desmarca un pago saliente como irrelevante (descripción opcional).
  async markIrrelevant(
    paymentId: number,
    isIrrelevant: boolean,
    description: string | null,
  ): Promise<ApiResponse<PaymentData>> {
    const result = await httpClient.patch<PaymentData>(
      `/payments/outgoing/${paymentId}/irrelevant`,
      { is_irrelevant: isIrrelevant, irrelevant_description: description },
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  // Crea una operación a mano desde un pago y lo vincula (soporta fondo + EXCHANGE en salida).
  async createOperation(
    table: PaymentTable,
    paymentId: number,
    body: {
      fromCurrency: string;
      toCurrency: string;
      fromAmount: number;
      toAmount: number;
      amountSide: 'SEND' | 'RECEIVE';
      fundGroupUuid?: string | null;
      exchangeUserUuid?: string | null;
    },
  ): Promise<ApiResponse<unknown>> {
    const result = await httpClient.post<unknown>(
      `/payments/${table}/${paymentId}/create-operation`,
      {
        from_currency: body.fromCurrency,
        to_currency: body.toCurrency,
        from_amount: body.fromAmount,
        to_amount: body.toAmount,
        amount_side: body.amountSide,
        fund_group_uuid: body.fundGroupUuid ?? null,
        exchange_user_uuid: body.exchangeUserUuid ?? null,
      },
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  // Registra un pago entrante como depósito (FundMovement DEPOSIT) a un fondo.
  async createDeposit(
    paymentId: number,
    body: {
      groupUuid: string;
      userUuid: string;
      amount: number;
      currency: string;
      depositMethod: string;
      reference?: string | null;
      notes?: string | null;
    },
  ): Promise<ApiResponse<PaymentData>> {
    const result = await httpClient.post<PaymentData>(
      `/payments/incoming/${paymentId}/deposit`,
      {
        group_uuid: body.groupUuid,
        user_uuid: body.userUuid,
        amount: body.amount,
        currency: body.currency,
        deposit_method: body.depositMethod,
        reference: body.reference ?? null,
        notes: body.notes ?? null,
      },
    );
    return { success: result.success, data: result.data, error: result.error };
  }
}

export const paymentService = new PaymentService();
