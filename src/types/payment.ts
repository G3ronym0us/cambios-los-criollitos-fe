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
  corrected_at: string | null;
  correction_original: string | null;
  created_at: string | null;
  // solo outgoing:
  is_personal_expense?: number;
  personal_description?: string | null;
  is_irrelevant?: number;
  irrelevant_description?: string | null;
  source_payment_id?: number | null;
  // solo incoming: depósito a fondo registrado desde este pago (inyectado por list_payments_page).
  deposit?: PaymentDeposit | null;
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
