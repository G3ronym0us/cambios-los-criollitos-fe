import { ApiResponse } from '@/types/auth';
import { httpClient } from '@/utils/httpInterceptor';
import { AdminOverview } from '@/types/overview';

export class OverviewService {
  /** El agregado de la home, ya recortado por rol en el servidor. */
  async getOverview(): Promise<ApiResponse<AdminOverview>> {
    const result = await httpClient.get<AdminOverview>('/admin/overview');
    return { success: result.success, data: result.data, error: result.error };
  }
}

export const overviewService = new OverviewService();
