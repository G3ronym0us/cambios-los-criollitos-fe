// Operación del bot (whatsapp_operations): el trato con el cliente vía WhatsApp.
// No confundir con TransactionData (registro contable con profit splits).

export type OperationStatus = 'QUOTED' | 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type DeliveryStatus = 'PENDING' | 'RECEIVED';
export type OperationScenario = 'NORMAL' | 'ZELLE_DIRECT' | 'VIA_PARTNER';

export interface OperationData {
  uuid: string;
  client_uuid: string | null;
  client_phone: string | null;
  client_display_name: string | null;
  currency_pair_uuid: string | null;
  pair_symbol: string | null;
  from_currency: string | null;
  to_currency: string | null;
  from_amount: number;
  to_amount: number;
  rate_used: number;
  inverse_percentage: boolean;
  applied_percentage: number | null;
  default_percentage: number | null;
  amount_side: 'SEND' | 'RECEIVE';
  bcv_usd: number | null;
  status: OperationStatus;
  scenario: OperationScenario;
  fund_group_uuid: string | null;
  fund_group_name: string | null;
  received_by_user_uuid: string | null;
  received_by_username: string | null;
  delivery_status: DeliveryStatus | null;
  delivered_at: string | null;
  notes: string | null;
  transaction_uuid: string | null;
  legacy_sqlite_id: string | null;
  quoted_at: string;
  expires_at: string;
  approved_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string | null;
  has_incoming_payment?: boolean;
  has_outgoing_payment?: boolean;
}

export interface OperationListResponse {
  operations: OperationData[];
  total: number;
}

export interface OperationStats {
  pending: number;
  completed: number;
  quoted: number;
  cancelled: number;
  completed_today: number;
}

export interface OperationFilters {
  status?: string;
  delivery_status?: string;
  phone?: string;
  limit?: number;
}

export interface UpdateScenarioPayload {
  scenario?: OperationScenario;
  fund_group_uuid?: string | null;
  received_by_user_uuid?: string | null;
  clear_fund_group?: boolean;
  clear_received_by?: boolean;
}
