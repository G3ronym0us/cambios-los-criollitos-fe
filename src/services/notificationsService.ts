import { ApiResponse } from '@/types/auth';
import { AlertsResponse, RateAlert } from '@/types/notifications';
import { httpClient } from '@/utils/httpInterceptor';

export class NotificationsService {
  async getAlerts(
    limit: number = 50,
    unacknowledgedOnly: boolean = false
  ): Promise<ApiResponse<AlertsResponse>> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(unacknowledgedOnly && { unacknowledged_only: 'true' })
    });
    const result = await httpClient.get<AlertsResponse>(`/notifications/alerts?${params}`);
    return { success: result.success, data: result.data, error: result.error };
  }

  async acknowledgeAlert(uuid: string): Promise<ApiResponse<RateAlert | void>> {
    const result = await httpClient.post<RateAlert>(
      `/notifications/alerts/${uuid}/acknowledge`
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  async getPushPublicKey(): Promise<ApiResponse<{ public_key: string }>> {
    const result = await httpClient.get<{ public_key: string }>(
      '/notifications/push/public-key'
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  async pushSubscribe(subscription: PushSubscriptionJSON): Promise<ApiResponse<{ ok: boolean }>> {
    const result = await httpClient.post<{ ok: boolean }>(
      '/notifications/push/subscribe',
      subscription
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  async pushUnsubscribe(endpoint: string): Promise<ApiResponse<{ ok: boolean }>> {
    const result = await httpClient.post<{ ok: boolean }>(
      '/notifications/push/unsubscribe',
      { endpoint }
    );
    return { success: result.success, data: result.data, error: result.error };
  }

  async pushTest(): Promise<ApiResponse<{ ok: boolean; sent: number }>> {
    const result = await httpClient.post<{ ok: boolean; sent: number }>(
      '/notifications/push/test'
    );
    return { success: result.success, data: result.data, error: result.error };
  }
}

export const notificationsService = new NotificationsService();
