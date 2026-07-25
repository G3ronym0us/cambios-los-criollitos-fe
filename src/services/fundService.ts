import {
  FundGroup,
  FundGroupMember,
  FundMovement,
  FundMovementsResponse,
  GroupBalance,
  UserPosition,
  FundMovementFilters,
  CreateFundGroup,
  UpdateFundGroup,
  AddFundMember,
  UpdateFundMember,
  CreateFundMovement,
  PendingDeposit,
  ConfirmPendingDeposit,
  CreatePendingDeposit,
} from '@/types/fund';
import { ApiResponse } from '@/types/auth';
import { httpClient } from '@/utils/httpInterceptor';
import { buildMovementsQuery } from './fundMovementsQuery';

export class FundService {
  async getGroups(activeOnly = true): Promise<ApiResponse<FundGroup[]>> {
    const endpoint = activeOnly ? '/funds/groups' : '/funds/groups?active_only=false';
    const result = await httpClient.get<FundGroup[]>(endpoint);
    return { success: result.success, data: result.data, error: result.error };
  }

  async createGroup(data: CreateFundGroup): Promise<ApiResponse<FundGroup>> {
    const result = await httpClient.post<FundGroup>('/funds/groups', data);
    return { success: result.success, data: result.data, error: result.error };
  }

  async updateGroup(groupUuid: string, data: UpdateFundGroup): Promise<ApiResponse<FundGroup>> {
    const result = await httpClient.patch<FundGroup>(`/funds/groups/${groupUuid}`, data);
    return { success: result.success, data: result.data, error: result.error };
  }

  async addMember(groupUuid: string, data: AddFundMember): Promise<ApiResponse<FundGroupMember>> {
    const result = await httpClient.post<FundGroupMember>(`/funds/groups/${groupUuid}/members`, data);
    return { success: result.success, data: result.data, error: result.error };
  }

  async updateMember(
    groupUuid: string,
    userUuid: string,
    data: UpdateFundMember,
  ): Promise<ApiResponse<FundGroupMember>> {
    const result = await httpClient.patch<FundGroupMember>(
      `/funds/groups/${groupUuid}/members/${userUuid}`,
      data,
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  async getGroupBalance(groupUuid: string): Promise<ApiResponse<GroupBalance>> {
    const result = await httpClient.get<GroupBalance>(`/funds/groups/${groupUuid}/balance`);
    return { success: result.success, data: result.data, error: result.error };
  }

  async getUserPosition(userUuid: string, groupUuid: string): Promise<ApiResponse<UserPosition>> {
    const result = await httpClient.get<UserPosition>(
      `/funds/users/${userUuid}/position?group_uuid=${groupUuid}`
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  async getGroupMovements(
    groupUuid: string,
    filters: FundMovementFilters = {}
  ): Promise<ApiResponse<FundMovementsResponse>> {
    const queryString = buildMovementsQuery(filters);
    const endpoint = queryString
      ? `/funds/groups/${groupUuid}/movements?${queryString}`
      : `/funds/groups/${groupUuid}/movements`;

    const result = await httpClient.get<FundMovementsResponse>(endpoint);
    return { success: result.success, data: result.data, error: result.error };
  }

  async createMovement(data: CreateFundMovement): Promise<ApiResponse<FundMovement>> {
    const result = await httpClient.post<FundMovement>('/funds/movements', data);
    return { success: result.success, data: result.data, error: result.error };
  }

  /**
   * Anula un movimiento con otro que lo referencia. No se borra: el original queda en el
   * libro marcado como reversado y el saldo lo corrige la reversa.
   */
  async reverseMovement(uuid: string, reason: string): Promise<ApiResponse<FundMovement>> {
    const result = await httpClient.post<FundMovement>(`/funds/movements/${uuid}/reverse`, {
      reason,
    });
    return { success: result.success, data: result.data, error: result.error };
  }

  // ===== Depósitos pendientes (única puerta a un movimiento DEPOSIT) =====

  async listPendingDeposits(status = 'PENDING'): Promise<ApiResponse<PendingDeposit[]>> {
    const result = await httpClient.get<PendingDeposit[]>(`/funds/pending-deposits?status=${status}`);
    return { success: result.success, data: result.data, error: result.error };
  }

  // Alta manual, para el depósito que el bot no detectó en el grupo.
  async createPendingDeposit(data: CreatePendingDeposit): Promise<ApiResponse<PendingDeposit>> {
    const result = await httpClient.post<PendingDeposit>('/funds/pending-deposits', data);
    return { success: result.success, data: result.data, error: result.error };
  }

  async confirmPendingDeposit(uuid: string, data: ConfirmPendingDeposit): Promise<ApiResponse<PendingDeposit>> {
    const result = await httpClient.post<PendingDeposit>(`/funds/pending-deposits/${uuid}/confirm`, data);
    return { success: result.success, data: result.data, error: result.error };
  }

  async rejectPendingDeposit(uuid: string): Promise<ApiResponse<PendingDeposit>> {
    const result = await httpClient.post<PendingDeposit>(`/funds/pending-deposits/${uuid}/reject`, {});
    return { success: result.success, data: result.data, error: result.error };
  }
}

export const fundService = new FundService();
