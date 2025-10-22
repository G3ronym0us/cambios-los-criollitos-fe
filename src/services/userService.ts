import {
  UserData,
  CommissionUserResponse,
  CommissionUserUpdate,
  CommissionUserList,
  UserFilters,
  UserCreate,
  UserUpdate
} from '@/types/user';
import { ApiResponse } from '@/types/auth';
import { httpClient } from '@/utils/httpInterceptor';

export class UserService {

  // Get Commission Users (paginated)
  async getCommissionUsers(filters: UserFilters = {}): Promise<ApiResponse<CommissionUserList>> {
    const params = new URLSearchParams();

    if (filters.page) params.append('page', filters.page.toString());
    if (filters.per_page) params.append('per_page', filters.per_page.toString());
    if (filters.active_only) params.append('active_only', 'true');

    const queryString = params.toString();
    const endpoint = queryString ? `/users/commission-users?${queryString}` : '/users/commission-users';

    const result = await httpClient.get<CommissionUserList>(endpoint);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  // Get Available Commission Users (simplified for dropdowns)
  async getAvailableCommissionUsers(): Promise<ApiResponse<CommissionUserResponse[]>> {
    const result = await httpClient.get<CommissionUserResponse[]>('/users/commission-users/available');
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  // Update Commission Settings
  async updateCommissionSettings(
    userUuid: string,
    data: CommissionUserUpdate
  ): Promise<ApiResponse<CommissionUserResponse>> {
    const result = await httpClient.put<CommissionUserResponse>(
      `/users/${userUuid}/commission-settings`,
      data
    );
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  // Get User by UUID
  async getUserById(userUuid: string): Promise<ApiResponse<UserData>> {
    const result = await httpClient.get<UserData>(`/users/${userUuid}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  // Get All Users (moderators only)
  async getAllUsers(filters: UserFilters = {}): Promise<ApiResponse<CommissionUserResponse[] | CommissionUserList>> {
    const params = new URLSearchParams();

    if (filters.page) params.append('page', filters.page.toString());
    if (filters.per_page) params.append('per_page', filters.per_page.toString());
    if (filters.active_only) params.append('active_only', 'true');

    const queryString = params.toString();
    const endpoint = queryString ? `/users?${queryString}` : '/users';

    const result = await httpClient.get<CommissionUserResponse[] | CommissionUserList>(endpoint);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  // Create User
  async createUser(data: UserCreate): Promise<ApiResponse<UserData>> {
    const result = await httpClient.post<UserData>('/users', data);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  // Update User
  async updateUser(userUuid: string, data: UserUpdate): Promise<ApiResponse<UserData>> {
    const result = await httpClient.put<UserData>(`/users/${userUuid}`, data);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }

  // Delete User (soft delete)
  async deleteUser(userUuid: string): Promise<ApiResponse<void>> {
    const result = await httpClient.delete<void>(`/users/${userUuid}`);
    return {
      success: result.success,
      data: result.data,
      error: result.error
    };
  }
}

export const userService = new UserService();
