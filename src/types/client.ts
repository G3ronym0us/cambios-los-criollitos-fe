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
  // Cuenta de pago predeterminada del cliente (bloque de datos + moneda fiat).
  default_payment_info: string | null;
  default_payment_currency: string | null;
  // Grupo de WhatsApp vinculado; solo lo llevan los clientes-entidad.
  linked_group_jid: string | null;
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

export type LoanPreferredValue = 'FIAT' | 'USDT' | 'BCV';
export type LoanStatus = 'OPEN' | 'PARTIAL' | 'PAID' | 'CANCELLED';

export interface LoanRepayment {
  uuid: string;
  preferred_amount: number;
  fiat_amount: number;
  fiat_currency: string;
  usdt_amount: number;
  usdt_rate: number;
  bcv_amount: number | null;
  bcv_rate: number | null;
  notes: string | null;
  created_by_username: string | null;
  created_at: string;
}

export interface LoanData {
  uuid: string;
  client_uuid: string;
  // Vacío cuando el préstamo se dio de alta a mano, sin comprobante que lo respalde.
  outgoing_payment_id: number | null;
  fiat_amount: number;
  fiat_currency: string;
  usdt_amount: number;
  usdt_rate: number;
  bcv_amount: number | null;
  bcv_rate: number | null;
  valuation_at: string;
  manual_values: boolean;
  preferred_value: LoanPreferredValue;
  preferred_currency: string;
  principal_amount: number;
  outstanding_amount: number;
  current_fiat_due: number | null;
  current_preferred_rate: number | null;
  status: LoanStatus;
  notes: string | null;
  created_by_username: string | null;
  created_at: string;
  updated_at: string | null;
  repayments: LoanRepayment[];
}

export interface LoanTotals {
  by_reference: { currency: string; amount: number }[];
  usdt_total: number | null;
  warnings: string[];
}

export interface ClientLoansSummary {
  client_uuid: string;
  loans: LoanData[];
  totals: LoanTotals;
}

// Equivalencias de un préstamo dado de alta a mano, con las tasas de la fecha indicada.
export interface ManualLoanValuation {
  fiat_amount: number;
  fiat_currency: string;
  usdt_amount: number | null;
  usdt_rate: number | null;
  bcv_amount: number | null;
  bcv_rate: number | null;
  valuation_at: string;
  warnings: string[];
}

// Alta de un préstamo sin comprobante que lo respalde.
export interface ManualLoanCreate {
  preferred_value: LoanPreferredValue;
  fiat_currency: string;
  fiat_amount: number;
  valuation_at: string;
  usdt_amount?: number | null;
  bcv_amount?: number | null;
  notes?: string | null;
}

// Cuenta de pago guardada de un cliente. `alias` es el nombre del beneficiario
// ("Yelitza Bolívar"); null en la cuenta predeterminada, que es la que se usa cuando el
// cliente cotiza sin nombrar a nadie.
export interface ClientAccount {
  uuid: string;
  alias: string | null;
  payment_info: string;
  currency: string;
  is_default: boolean;
  is_confirmed: boolean;
  source: 'MESSAGE' | 'RECEIPT' | 'MANUAL';
  last_used_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ClientAccountCreate {
  alias?: string | null;
  payment_info: string;
  currency: string;
  is_default?: boolean;
}

export interface ClientAccountUpdate {
  alias?: string | null;
  payment_info?: string;
  currency?: string;
  is_default?: boolean;
  is_confirmed?: boolean;
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
  default_payment_info?: string | null;
  default_payment_currency?: string | null;
  // Grupo vinculado de una entidad; enviar null para desvincular.
  linked_group_jid?: string | null;
}

export interface ClientFilters {
  skip?: number;
  limit?: number;
  search?: string;
  is_blocked?: boolean;
  is_tracked?: boolean;
}
