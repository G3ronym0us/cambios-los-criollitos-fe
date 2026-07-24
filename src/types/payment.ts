// Pagos del bot (whatsapp_incoming_payments / whatsapp_outgoing_payments),
// extraídos de comprobantes por OCR. Vienen como dict del backend (list_payments).

import type { OperationStatus } from '@/types/operation';

export type PaymentTable = 'incoming' | 'outgoing';

// Respuesta paginada de GET /payments/{table}.
export interface PaymentPage {
  items: PaymentData[];
  total: number;
}

export interface PaymentQuery {
  limit?: number;
  offset?: number;
  search?: string;
  outClass?: string;
  unlinkedOnly?: boolean;
}

export interface PaymentData {
  id: number;
  uuid: string;
  client_phone: string;
  client_name: string | null;
  client_uuid: string | null;
  provider: string | null;
  amount: number | null;
  currency: string | null;
  bank_from: string | null;
  bank_to: string | null;
  account_number: string | null;
  identification: string | null;
  phone_to: string | null;
  reference: string | null;
  raw_text: string | null;
  operation_uuid: string | null;
  // Estado de la operación vinculada (si la hay), inyectado por list_payments.
  operation_status?: OperationStatus | null;
  // solo incoming: grupo (FundGroup) donde se contabilizó el Zelle al reenviarlo (ZELLE_DIRECT).
  fund_group_uuid?: string | null;
  fund_group_name?: string | null;
  corrected_at: string | null;
  correction_original: string | null;
  created_at: string | null;
  // solo outgoing:
  is_personal_expense?: number;
  personal_description?: string | null;
  is_irrelevant?: number;
  irrelevant_description?: string | null;
  source_payment_id?: number | null;
  // solo outgoing: cuánto del valor de su operación cubre, y a qué tasa quedó.
  settled_amount?: number | null;
  settled_rate?: number | null;
  settled_reference_rate?: number | null;
  // solo incoming: depósito a fondo registrado desde este pago (inyectado por list_payments_page).
  deposit?: PaymentDeposit | null;
  // solo incoming: reparto del pago entre operaciones (un Zelle puede cubrir varios cambios).
  allocated_amount?: number;
  allocations_count?: number;
  unassigned_amount?: number;
  // solo en el detalle de una op: cuánto de este pago le corresponde a ESA operación.
  allocated_to_operation?: number | null;
  // solo outgoing: préstamo al cliente originado en este pago.
  loan?: PaymentLoanSummary | null;
}

export type LoanPreferredValue = 'FIAT' | 'USDT' | 'BCV';

export interface PaymentLoanSummary {
  uuid: string;
  status: 'OPEN' | 'PARTIAL' | 'PAID' | 'CANCELLED';
  preferred_value: LoanPreferredValue;
  preferred_currency: string;
  principal_amount: number;
  outstanding_amount: number;
}

export interface LoanValuation {
  payment_id: number;
  detected_amount: number;
  detected_currency: string | null;
  fiat_amount: number | null;
  fiat_currency: string;
  usdt_amount: number | null;
  usdt_rate: number | null;
  usdt_rate_at: string | null;
  bcv_amount: number | null;
  bcv_rate: number | null;
  bcv_rate_at: string | null;
  valuation_at: string;
  warnings: string[];
}

export type DepositMethod = 'ZELLE' | 'BINANCE' | 'KRAKEN' | 'TRANSFER' | 'OTHER';

export const DEPOSIT_METHODS: DepositMethod[] = ['ZELLE', 'BINANCE', 'KRAKEN', 'TRANSFER', 'OTHER'];

export interface PaymentDeposit {
  uuid: string;
  method: string | null;
  amount: number | null;
  currency: string | null;
  group_name: string | null;
}

// ---- Reparto de un pago entrante entre operaciones ----

export interface PaymentAllocation {
  uuid: string;
  amount: number;
  operation_uuid: string | null;
  operation_status: OperationStatus | null;
  pair_symbol: string | null;
  from_amount: number | null;
  from_currency: string | null;
  to_amount: number | null;
  to_currency: string | null;
  rate_used: number | null;
  created_by_username: string | null;
  created_at: string | null;
  // Comprobantes con los que se pagó esa operación.
  paid_with: { id: number; amount: number | null; currency: string | null; reference: string | null }[];
}

export interface PaymentAllocationSummary {
  payment_id: number;
  amount: number;
  currency: string | null;
  client_phone: string | null;
  assigned: number;
  credited_to_balance: number;
  unassigned: number;
  allocations: PaymentAllocation[];
}

// Cuánto del valor de una operación cubriría un comprobante de salida.
export interface OutgoingCoverage {
  payment: { id: number; amount: number | null; currency: string | null };
  operation_uuid: string;
  value: number;
  value_currency: string;
  delivered: number;
  pending: number;
  reference_rate: number | null;
  // Lo que da la tasa de referencia: 914,04 ÷ 4,5702 = 200.
  suggested_settled_amount: number | null;
  // Si se decide que cubre todo el pendiente: a qué tasa quedó y cuánto se aparta.
  full_effective_rate: number | null;
  full_rate_difference: number | null;
  full_amount_difference: number | null;
}
