import { ApiResponse } from '@/types/auth';
import { httpClient } from '@/utils/httpInterceptor';
import type { LoanData } from '@/types/client';
import type { LoanPreferredValue, LoanValuation, PaymentData, PaymentPage, PaymentQuery, PaymentTable } from '@/types/payment';

export class PaymentService {
  // Página de pagos entrantes/salientes (paginada + búsqueda/clasificación server-side).
  async getPayments(table: PaymentTable, query: PaymentQuery = {}): Promise<ApiResponse<PaymentPage>> {
    const sp = new URLSearchParams();
    sp.set('limit', String(query.limit ?? 50));
    sp.set('offset', String(query.offset ?? 0));
    if (query.search) sp.set('search', query.search);
    if (query.outClass && query.outClass !== 'ALL') sp.set('out_class', query.outClass);
    if (query.unlinkedOnly) sp.set('unlinked_only', 'true');
    const result = await httpClient.get<PaymentPage>(`/payments/${table}?${sp.toString()}`);
    return { success: result.success, data: result.data, error: result.error };
  }

  // Vincula (operationUuid) o desvincula (null) un pago a una operación.
  // settleAmount (solo salientes): monto USD realmente cambiado; la op se
  // redimensiona y el excedente se acredita como saldo a favor al completar.
  async linkOperation(
    table: PaymentTable,
    paymentId: number,
    operationUuid: string | null,
    settleAmount?: number | null,
  ): Promise<ApiResponse<PaymentData>> {
    const result = await httpClient.patch<PaymentData>(
      `/payments/${table}/${paymentId}/operation`,
      { operation_uuid: operationUuid, settle_amount: settleAmount ?? null },
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

  async createLoan(
    paymentId: number,
    body: {
      preferredValue: LoanPreferredValue;
      paymentCurrency: string;
      fiatCurrency: string;
      fiatAmount: number;
      usdtAmount: number;
      bcvAmount?: number | null;
      notes?: string | null;
    },
  ): Promise<ApiResponse<LoanData>> {
    const result = await httpClient.post<LoanData>(`/payments/outgoing/${paymentId}/loan`, {
      preferred_value: body.preferredValue,
      payment_currency: body.paymentCurrency,
      fiat_currency: body.fiatCurrency,
      fiat_amount: body.fiatAmount,
      usdt_amount: body.usdtAmount,
      bcv_amount: body.bcvAmount ?? null,
      notes: body.notes ?? null,
    });
    return { success: result.success, data: result.data, error: result.error };
  }

  async getLoanValuation(
    paymentId: number,
    fiatCurrency?: string,
    paymentCurrency?: string,
  ): Promise<ApiResponse<LoanValuation>> {
    const params = new URLSearchParams();
    if (fiatCurrency) params.set('fiat_currency', fiatCurrency);
    if (paymentCurrency) params.set('payment_currency', paymentCurrency);
    const query = params.toString();
    const result = await httpClient.get<LoanValuation>(
      `/payments/outgoing/${paymentId}/loan-valuation${query ? `?${query}` : ''}`,
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

  // Acredita un pago entrante (Zelle/PayPal/USD) como saldo a favor del cliente.
  async creditBalance(
    paymentId: number,
    body: { amount?: number | null; notes?: string | null } = {},
  ): Promise<ApiResponse<unknown>> {
    const result = await httpClient.post<unknown>(
      `/payments/incoming/${paymentId}/credit-balance`,
      { amount: body.amount ?? null, notes: body.notes ?? null },
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  // Mueve un comprobante entre las bandejas entrante y saliente.
  async convertToIncoming(paymentId: number): Promise<ApiResponse<PaymentData>> {
    const result = await httpClient.post<PaymentData>(
      `/payments/outgoing/${paymentId}/convert-to-incoming`,
      {},
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  async convertToOutgoing(paymentId: number): Promise<ApiResponse<PaymentData>> {
    const result = await httpClient.post<PaymentData>(
      `/payments/incoming/${paymentId}/convert-to-outgoing`,
      {},
    );
    return { success: result.success, data: result.data, error: result.error };
  }
}

export const paymentService = new PaymentService();
