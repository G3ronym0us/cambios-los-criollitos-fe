// Cliente del bot (whatsapp_clients) visto como "cliente" del negocio.
// No confundir con UserData (operadores/socios del sistema, con login y rol).

export interface ClientData {
  uuid: string;
  phone: string;
  display_name: string | null;
  preferred_pair_uuid: string | null;
  preferred_pair_symbol: string | null;
  is_tracked: boolean;
  is_blocked: boolean;
  is_usdt_authorized: boolean;
  // Saldo a favor en USD (ledger de abonos); 0 si no tiene.
  balance: number;
  last_seen_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Movimiento del ledger de saldo a favor (CREDIT = deja plata en cuenta, DEBIT = abono).
export interface BalanceEntry {
  uuid: string;
  client_uuid: string | null;
  entry_type: 'CREDIT' | 'DEBIT';
  amount: number;
  currency: string;
  incoming_payment_id: number | null;
  operation_uuid: string | null;
  operation_rate_used: number | null;
  operation_to_amount: number | null;
  notes: string | null;
  created_by_username: string | null;
  created_at: string;
}

export interface BalanceSummary {
  client_uuid: string;
  client_phone: string;
  balance: number;
  currency: string;
  entries: BalanceEntry[];
}

export interface BalanceAdjust {
  entry_type: 'CREDIT' | 'DEBIT';
  amount: number;
  notes?: string | null;
}

export interface ClientListResponse {
  items: ClientData[];
  total: number;
  skip: number;
  limit: number;
}

export interface ClientUpdate {
  display_name?: string | null;
  is_tracked?: boolean;
  is_blocked?: boolean;
  is_usdt_authorized?: boolean;
  preferred_pair_uuid?: string | null;
}

export interface ClientFilters {
  skip?: number;
  limit?: number;
  search?: string;
  is_blocked?: boolean;
  is_tracked?: boolean;
}
