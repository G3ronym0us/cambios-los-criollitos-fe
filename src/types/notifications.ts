export interface RateAlert {
  uuid: string;
  from_currency: string;
  to_currency: string;
  manual_rate: number;
  automatic_rate: number;
  diff_percentage: number;
  created_at: string;
  acknowledged_at?: string | null;
}

export interface AlertsResponse {
  alerts: RateAlert[];
  total: number;
}

export interface SSEConnectedEvent {
  user_id: string;
}
