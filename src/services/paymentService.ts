import { ApiResponse } from '@/types/auth';
import { httpClient } from '@/utils/httpInterceptor';
import type { LoanData } from '@/types/client';
import type {
  LoanPreferredValue,
  LoanValuation,
  OutgoingCoverage,
  PaymentAllocationSummary,
  PaymentData,
  PaymentPage,
  PaymentQuery,
  PaymentStats,
  PaymentSuggestion,
  PaymentTable,
} from '@/types/payment';
import type { OrphanAction, UnlinkPreview } from '@/types/operation';

export class PaymentService {
  // Página de pagos entrantes/salientes (paginada + búsqueda/clasificación server-side).
  async getPayments(table: PaymentTable, query: PaymentQuery = {}): Promise<ApiResponse<PaymentPage>> {
    const sp = new URLSearchParams();
    sp.set('limit', String(query.limit ?? 50));
    sp.set('offset', String(query.offset ?? 0));
    this.appendFilters(sp, query);
    if (query.unlinkedOnly) sp.set('unlinked_only', 'true');
    if (query.attention && query.attention !== 'ALL') sp.set('attention', query.attention);
    const result = await httpClient.get<PaymentPage>(`/payments/${table}?${sp.toString()}`);
    return { success: result.success, data: result.data, error: result.error };
  }

  // Agregados de la franja de atención. Toma los mismos filtros que el listado salvo
  // `attention`: la cifra de "por atender" es justamente la que ese segmento selecciona.
  async getStats(table: PaymentTable, query: PaymentQuery = {}): Promise<ApiResponse<PaymentStats>> {
    const sp = new URLSearchParams();
    this.appendFilters(sp, query);
    const qs = sp.toString();
    const result = await httpClient.get<PaymentStats>(
      `/payments/${table}/stats${qs ? `?${qs}` : ''}`,
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  // Operación sugerida para una tanda de comprobantes (una página del listado).
  async getSuggestions(
    table: PaymentTable,
    paymentIds: number[],
  ): Promise<ApiResponse<{ items: PaymentSuggestion[] }>> {
    const result = await httpClient.post<{ items: PaymentSuggestion[] }>(
      `/payments/${table}/suggestions`,
      { payment_ids: paymentIds },
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  private appendFilters(sp: URLSearchParams, query: PaymentQuery) {
    if (query.search) sp.set('search', query.search);
    if (query.outClass && query.outClass !== 'ALL') sp.set('out_class', query.outClass);
    if (query.dateFrom) sp.set('date_from', query.dateFrom);
    if (query.dateTo) sp.set('date_to', query.dateTo);
  }

  // Cuánto del valor de una operación cubriría este comprobante de salida.
  async outgoingCoverage(
    paymentId: number,
    operationUuid: string,
  ): Promise<ApiResponse<OutgoingCoverage>> {
    const result = await httpClient.get<OutgoingCoverage>(
      `/payments/outgoing/${paymentId}/coverage?operation_uuid=${operationUuid}`,
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  // Reparto de un pago entrante entre operaciones: qué cubre y qué queda sin asignar.
  async getAllocations(paymentId: number): Promise<ApiResponse<PaymentAllocationSummary>> {
    const result = await httpClient.get<PaymentAllocationSummary>(
      `/payments/incoming/${paymentId}/allocations`,
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  // Reemplaza el reparto completo (la suma no puede pasarse del monto del pago).
  async setAllocations(
    paymentId: number,
    allocations: { operation_uuid: string; amount: number }[],
  ): Promise<ApiResponse<PaymentAllocationSummary>> {
    const result = await httpClient.put<PaymentAllocationSummary>(
      `/payments/incoming/${paymentId}/allocations`,
      { allocations },
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  // Qué dejaría atrás desvincular este pago (¿su operación se queda sin comprobantes?).
  async unlinkPreview(table: PaymentTable, paymentId: number): Promise<ApiResponse<UnlinkPreview>> {
    const result = await httpClient.get<UnlinkPreview>(
      `/payments/${table}/${paymentId}/unlink-preview`,
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  // Vincula (operationUuid) o desvincula (null) un pago a una operación.
  // settledAmount (solo salientes): cuánto del valor de la operación cubre este comprobante.
  // orphan (solo al desvincular el último pago): qué hacer con la operación que queda
  // sin respaldo — sin esto el backend responde 409.
  async linkOperation(
    table: PaymentTable,
    paymentId: number,
    operationUuid: string | null,
    orphan?: { action: OrphanAction; note?: string | null },
    settledAmount?: number | null,
  ): Promise<ApiResponse<PaymentData>> {
    const result = await httpClient.patch<PaymentData>(
      `/payments/${table}/${paymentId}/operation`,
      {
        operation_uuid: operationUuid,
        orphan_action: orphan?.action ?? null,
        orphan_note: orphan?.note ?? null,
        settled_amount: settledAmount ?? null,
      },
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  // Corrige a mano lo que el OCR leyó mal. Solo viajan los campos incluidos: el backend
  // guarda el valor anterior en `correction_original` y marca el pago como corregido.
  async updateFields(
    table: PaymentTable,
    paymentId: number,
    fields: { amount?: number; currency?: string; reference?: string },
  ): Promise<ApiResponse<PaymentData>> {
    const result = await httpClient.patch<PaymentData>(`/payments/${table}/${paymentId}`, fields);
    return { success: result.success, data: result.data, error: result.error };
  }

  // Marca/desmarca un pago saliente como gasto personal (descripción requerida al marcar).
  async markPersonalExpense(
    paymentId: number,
    isPersonal: boolean,
    description: string | null,
    orphan?: { action: OrphanAction; note?: string | null },
  ): Promise<ApiResponse<PaymentData>> {
    const result = await httpClient.patch<PaymentData>(
      `/payments/outgoing/${paymentId}/personal-expense`,
      {
        is_personal_expense: isPersonal,
        personal_description: description,
        orphan_action: orphan?.action ?? null,
        orphan_note: orphan?.note ?? null,
      },
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  // Marca/desmarca un pago saliente como irrelevante (descripción opcional).
  async markIrrelevant(
    paymentId: number,
    isIrrelevant: boolean,
    description: string | null,
    orphan?: { action: OrphanAction; note?: string | null },
  ): Promise<ApiResponse<PaymentData>> {
    const result = await httpClient.patch<PaymentData>(
      `/payments/outgoing/${paymentId}/irrelevant`,
      {
        is_irrelevant: isIrrelevant,
        irrelevant_description: description,
        orphan_action: orphan?.action ?? null,
        orphan_note: orphan?.note ?? null,
      },
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
      // Deudor explícito. Obligatorio cuando el comprobante se mandó a un grupo.
      clientUuid?: string | null;
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
      client_uuid: body.clientUuid ?? null,
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
      /** Por qué el valor no es el del comprobante, cuando el operador decide dejar la diferencia. */
      notes?: string | null;
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
