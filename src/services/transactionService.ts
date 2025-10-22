import {
  TransactionData,
  CreateTransactionData,
  UpdateTransactionData,
  TransactionsResponse,
  UserProfitReport,
  ProfitSummary,
  TransactionStats,
  TransactionFilters
} from '@/types/transaction';
import { ApiResponse } from '@/types/auth';
import { httpClient } from '@/utils/httpInterceptor';

export class TransactionService {

  // Create Transaction
  async createTransaction(data: CreateTransactionData, force: boolean = false): Promise<ApiResponse<TransactionData>> {
    const payload = force ? { ...data, force: true } : data;
    const result = await httpClient.post<TransactionData>('/transactions', payload);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  // Get Transactions with Filters
  async getTransactions(filters: TransactionFilters = {}): Promise<ApiResponse<TransactionsResponse>> {
    const params = new URLSearchParams();

    if (filters.status_filter) params.append('status_filter', filters.status_filter);
    if (filters.from_currency) params.append('from_currency', filters.from_currency);
    if (filters.to_currency) params.append('to_currency', filters.to_currency);
    if (filters.user_uuid) params.append('user_uuid', filters.user_uuid);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.per_page) params.append('per_page', filters.per_page.toString());

    const queryString = params.toString();
    const endpoint = queryString ? `/transactions?${queryString}` : '/transactions';

    const result = await httpClient.get<TransactionsResponse>(endpoint);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  // Get Transaction by UUID
  async getTransactionById(uuid: string): Promise<ApiResponse<TransactionData>> {
    const result = await httpClient.get<TransactionData>(`/transactions/${uuid}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  // Update Transaction (Moderators only)
  async updateTransaction(uuid: string, data: UpdateTransactionData): Promise<ApiResponse<TransactionData>> {
    const result = await httpClient.put<TransactionData>(`/transactions/${uuid}`, data);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  // Delete Transaction (Moderators only)
  async deleteTransaction(uuid: string): Promise<ApiResponse<void>> {
    const result = await httpClient.delete(`/transactions/${uuid}`);
    return {
      success: result.success,
      error: result.error
    };
  }

  // Get User Profit Report
  async getUserProfitReport(
    userUuid: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<UserProfitReport>> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const queryString = params.toString();
    const endpoint = queryString
      ? `/transactions/reports/user/${userUuid}?${queryString}`
      : `/transactions/reports/user/${userUuid}`;

    const result = await httpClient.get<UserProfitReport>(endpoint);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  // Get Summary Report (Moderators/Admins only)
  async getSummaryReport(lastDays?: number): Promise<ApiResponse<ProfitSummary>> {
    const params = new URLSearchParams();
    if (lastDays) params.append('last_days', lastDays.toString());

    const queryString = params.toString();
    const endpoint = queryString
      ? `/transactions/reports/summary?${queryString}`
      : '/transactions/reports/summary';

    const result = await httpClient.get<ProfitSummary>(endpoint);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  // Get My Profits
  async getMyProfits(startDate?: string, endDate?: string): Promise<ApiResponse<UserProfitReport>> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const queryString = params.toString();
    const endpoint = queryString
      ? `/transactions/reports/my-profits?${queryString}`
      : '/transactions/reports/my-profits';

    const result = await httpClient.get<UserProfitReport>(endpoint);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  // Get Transaction Stats
  async getTransactionStats(): Promise<ApiResponse<TransactionStats>> {
    const result = await httpClient.get<TransactionStats>('/transactions/stats');
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }
}

export const transactionService = new TransactionService();
