// Pagos del bot (whatsapp_incoming_payments / whatsapp_outgoing_payments),
// extraídos de comprobantes por OCR. Vienen como dict del backend (list_payments).

export type PaymentTable = 'incoming' | 'outgoing';

export interface PaymentData {
  id: number;
  uuid: string;
  client_phone: string;
  client_name: string | null;
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
  corrected_at: string | null;
  correction_original: string | null;
  created_at: string | null;
  // solo outgoing:
  is_personal_expense?: number;
  personal_description?: string | null;
  is_irrelevant?: number;
  source_payment_id?: number | null;
}
