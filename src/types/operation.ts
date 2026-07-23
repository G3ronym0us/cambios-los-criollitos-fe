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
  // La op quedó sin ningún comprobante y un operador aceptó dejarla así.
  no_payments_ack_by_username: string | null;
  no_payments_ack_at: string | null;
  no_payments_ack_note: string | null;
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

// Qué dejaría atrás desvincular un pago: si su operación se queda sin comprobantes,
// todo lo que se borraría al elegir borrarla.
export interface UnlinkPreview {
  would_orphan: boolean;
  operation: OperationData | null;
  transaction_uuid?: string | null;
  fund_group_name?: string | null;
  fund_movements?: { uuid: string; movement_type: string | null; amount: number; currency: string }[];
  balance_entries?: number;
  can_delete?: boolean;
}

// Decisión que acompaña al desvinculado cuando dejaría la op sin comprobantes.
export type OrphanAction = 'KEEP' | 'DELETE_OPERATION';

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
