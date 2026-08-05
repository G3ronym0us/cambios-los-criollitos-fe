import { ApiResponse } from '@/types/auth';
import { httpClient } from '@/utils/httpInterceptor';
import {
  BalanceAdjust,
  BalanceEntry,
  BalanceSummary,
  ClientAccount,
  ClientAccountCreate,
  ClientAccountUpdate,
  ClientData,
  ClientFilters,
  ClientListResponse,
  ClientLoansSummary,
  LoanData,
  ClientUpdate,
  ManualLoanCreate,
  ManualLoanValuation,
} from '@/types/client';

export class ClientService {
  // Lista de clientes del bot. Requiere operador autenticado (JWT).
  async getClients(filters: ClientFilters = {}): Promise<ApiResponse<ClientListResponse>> {
    const params = new URLSearchParams();
    if (filters.skip != null) params.append('skip', String(filters.skip));
    if (filters.limit != null) params.append('limit', String(filters.limit));
    if (filters.search) params.append('search', filters.search);
    if (filters.is_blocked != null) params.append('is_blocked', String(filters.is_blocked));
    if (filters.is_tracked != null) params.append('is_tracked', String(filters.is_tracked));

    const qs = params.toString();
    const result = await httpClient.get<ClientListResponse>(qs ? `/clients?${qs}` : '/clients');
    return { success: result.success, data: result.data, error: result.error };
  }

  async getClient(uuid: string): Promise<ApiResponse<ClientData>> {
    const result = await httpClient.get<ClientData>(`/clients/${uuid}`);
    return { success: result.success, data: result.data, error: result.error };
  }

  // Alta de un negocio sin teléfono propio. Requiere moderador+ en el backend.
  async createEntity(data: {
    display_name: string;
    linked_group_jid?: string | null;
  }): Promise<ApiResponse<ClientData>> {
    const result = await httpClient.post<ClientData>('/clients', {
      display_name: data.display_name,
      linked_group_jid: data.linked_group_jid ?? null,
    });
    return { success: result.success, data: result.data, error: result.error };
  }

  // Editar requiere moderador+ en el backend.
  async updateClient(uuid: string, data: ClientUpdate): Promise<ApiResponse<ClientData>> {
    const result = await httpClient.patch<ClientData>(`/clients/${uuid}`, data);
    return { success: result.success, data: result.data, error: result.error };
  }

  // Saldo a favor del cliente + movimientos del ledger.
  async getClientBalance(uuid: string): Promise<ApiResponse<BalanceSummary>> {
    const result = await httpClient.get<BalanceSummary>(`/clients/${uuid}/balance`);
    return { success: result.success, data: result.data, error: result.error };
  }

  // Ajuste manual del saldo (CREDIT/DEBIT). Requiere moderador+ en el backend.
  async adjustClientBalance(
    uuid: string,
    data: BalanceAdjust,
  ): Promise<ApiResponse<BalanceEntry & { balance_after: number }>> {
    const result = await httpClient.post<BalanceEntry & { balance_after: number }>(
      `/clients/${uuid}/balance/adjust`,
      data,
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  async getClientLoans(uuid: string): Promise<ApiResponse<ClientLoansSummary>> {
    const result = await httpClient.get<ClientLoansSummary>(`/clients/${uuid}/loans`);
    return { success: result.success, data: result.data, error: result.error };
  }

  // Equivalencias de un préstamo sin comprobante, con las tasas de la fecha indicada.
  async getManualLoanValuation(
    clientUuid: string,
    amount: number,
    currency: string,
    at: string,
  ): Promise<ApiResponse<ManualLoanValuation>> {
    const params = new URLSearchParams({ amount: String(amount), currency, at });
    const result = await httpClient.get<ManualLoanValuation>(
      `/clients/${clientUuid}/loans/valuation?${params.toString()}`,
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  // Registra un préstamo a mano, sin comprobante.
  async createManualLoan(
    clientUuid: string,
    body: ManualLoanCreate,
  ): Promise<ApiResponse<LoanData>> {
    const result = await httpClient.post<LoanData>(`/clients/${clientUuid}/loans`, body);
    return { success: result.success, data: result.data, error: result.error };
  }

  async addLoanRepayment(
    clientUuid: string,
    loanUuid: string,
    preferredAmount: number,
    notes?: string | null,
  ): Promise<ApiResponse<LoanData>> {
    const result = await httpClient.post<LoanData>(
      `/clients/${clientUuid}/loans/${loanUuid}/repayments`,
      { preferred_amount: preferredAmount, notes: notes ?? null },
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  // Libreta de cuentas del cliente (beneficiarios con nombre). Listar requiere usuario
  // autenticado; crear/editar/borrar requieren moderador+ en el backend.
  async getAccounts(clientUuid: string): Promise<ApiResponse<{ items: ClientAccount[] }>> {
    const result = await httpClient.get<{ items: ClientAccount[] }>(`/clients/${clientUuid}/accounts`);
    return { success: result.success, data: result.data, error: result.error };
  }

  async createAccount(clientUuid: string, data: ClientAccountCreate): Promise<ApiResponse<ClientAccount>> {
    const result = await httpClient.post<ClientAccount>(`/clients/${clientUuid}/accounts`, data);
    return { success: result.success, data: result.data, error: result.error };
  }

  async updateAccount(accountUuid: string, data: ClientAccountUpdate): Promise<ApiResponse<ClientAccount>> {
    const result = await httpClient.patch<ClientAccount>(`/clients/accounts/${accountUuid}`, data);
    return { success: result.success, data: result.data, error: result.error };
  }

  async deleteAccount(accountUuid: string): Promise<ApiResponse<void>> {
    const result = await httpClient.delete<void>(`/clients/accounts/${accountUuid}`);
    return { success: result.success, data: result.data, error: result.error };
  }
}

export const clientService = new ClientService();
