// Pagos del bot (whatsapp_incoming_payments / whatsapp_outgoing_payments),
// extraídos de comprobantes por OCR. Vienen como dict del backend (list_payments).

import type { OperationStatus } from '@/types/operation';

export type PaymentTable = 'incoming' | 'outgoing';

// Respuesta paginada de GET /payments/{table}.
export interface PaymentPage {
  items: PaymentData[];
  total: number;
}

// Segmento de la bandeja: lo que espera una decisión, lo ya cuadrado, o todo.
export type AttentionFilter = 'ALL' | 'ATTENTION' | 'RECONCILED';

export interface PaymentQuery {
  limit?: number;
  offset?: number;
  search?: string;
  outClass?: string;
  unlinkedOnly?: boolean;
  attention?: AttentionFilter;
  dateFrom?: string;
  dateTo?: string;
}

// Agregados de la franja de atención (GET /payments/{table}/stats).
export interface PaymentStats {
  table: PaymentTable;
  needs_attention: number;
  // Dinero por atender que todavía no respalda ninguna operación, por moneda.
  unassigned: { currency: string; amount: number; count: number }[];
  // El monto se calcula fila a fila sobre un tope: con más pendientes se queda corto.
  unassigned_truncated: boolean;
  received_today: number;
  reconciled_today: number;
}

// Operación que el matcher propone para un comprobante del listado.
export interface PaymentSuggestion {
  payment_id: number;
  operation_uuid: string;
  // false = hay otra candidata igual de cerca; se muestra igual, pero sin insistir.
  confident: boolean;
  score: number;
  delta: number | null;
  from_amount: number | null;
  from_currency: string | null;
  to_amount: number | null;
  to_currency: string | null;
  status: string | null;
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
  // solo incoming: parte del pago acreditada al saldo del cliente en vez de a una operación.
  credited_to_balance?: number;
  // solo en el detalle de una op: cuánto de este pago le corresponde a ESA operación.
  allocated_to_operation?: number | null;
  // solo outgoing: préstamo al cliente originado en este pago.
  loan?: PaymentLoanSummary | null;
  // los dos lados: el comprobante archivado como depósito al fondo. No vive en el pago sino en
  // Fondos, pero viaja con la fila porque es lo que la sacó de «Por atender».
  fund_deposit?: PaymentFundDeposit | null;
  // El pago cambió de dueño en algún momento. Viaja con la fila (y no en una llamada aparte)
  // porque la insignia del listado y el chip de la cabecera lo necesitan siempre.
  transfer?: PaymentTransfer | null;
}

/** Por qué se mudó un pago de cliente. Las etiquetas viven en `_components/paymentTransfer`. */
export type PaymentTransferReason = 'THIRD_PARTY' | 'BOT_MISMATCH' | 'DUPLICATE_CLIENT';

/**
 * De dónde salió un pago que se transfirió a otro cliente.
 *
 * Es el PRIMER origen, no el anterior: un pago se puede transferir varias veces y lo que
 * importa en la cabecera es de qué perfil salió realmente. La cadena completa está en la
 * bitácora (`PaymentTimelineEntry`), que es donde se apilan los saltos intermedios.
 */
export interface PaymentTransfer {
  from_client_uuid: string | null;
  from_client_name: string | null;
  from_client_phone: string | null;
  reason: PaymentTransferReason | null;
  note: string | null;
  transferred_at: string | null;
  /** Operador que la hizo (username), para el chip de la cabecera. */
  transferred_by: string | null;
  /** Cuántas transferencias acumula el pago. 1 en el caso normal. */
  count: number;
}

/**
 * Una línea de la bitácora del pago.
 *
 * Deliberadamente genérica: el backend redacta `title` y `detail`, y el front solo los pinta
 * en orden. Así una clase de evento nueva sale en la bitácora sin tocar esta pantalla —
 * `kind` únicamente elige el color del punto.
 */
export type PaymentTimelineKind =
  | 'TRANSFER'
  | 'LINK'
  | 'UNLINK'
  | 'CORRECTION'
  | 'DEPOSIT'
  | 'BALANCE'
  | 'OTHER';

export interface PaymentTimelineEntry {
  uuid: string;
  kind: PaymentTimelineKind;
  /** Qué pasó, en una línea ("Transferido a otro cliente"). */
  title: string;
  /** El detalle largo, ya redactado. `null` cuando el título se basta solo. */
  detail: string | null;
  /** Operador que lo hizo, o `null` si fue automático. */
  actor: string | null;
  at: string | null;
}

export interface PaymentFundDeposit {
  uuid: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  amount: number | null;
  currency: string | null;
  group_name: string | null;
  username: string | null;
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
  // El comprobante llegó de un grupo (o de un cliente aún anónimo): hace falta indicar
  // a nombre de quién queda el préstamo. `suggested_client` es la entidad vinculada a
  // ese grupo, si existe, para preseleccionarla.
  requires_borrower: boolean;
  suggested_client: { uuid: string; display_name: string | null } | null;
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
  // null = reparto implícito: lo que el vínculo directo del pago ya asigna a esa operación,
  // todavía sin fila en la tabla de reparto. Se materializa si el operador guarda el panel.
  uuid: string | null;
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
/** Una operación cubierta por un comprobante de salida, con su parte del valor. */
export interface OutgoingSettlement {
  uuid: string;
  /** En la moneda del VALOR de la operación (80 ZELLE), no en la del comprobante. */
  settled_amount: number;
  settled_reference_rate: number | null;
  operation_uuid: string | null;
  operation_status: string | null;
  pair_symbol: string | null;
  operation_value?: number;
  operation_value_currency?: string;
  operation_delivered?: number;
  operation_pending?: number;
}

/** Reparto de un comprobante de salida entre las operaciones que cubre. */
export interface OutgoingSettlementSummary {
  payment_id: number;
  amount: number | null;
  currency: string | null;
  /** Suma de las partes, cada una en la moneda de su operación: NO comparable con `amount`. */
  settled_total: number;
  /** Lo mismo pasado por las tasas de referencia, que sí se compara con el comprobante. */
  covered_in_payment_currency: number;
  unassigned_in_payment_currency: number;
  settlements: OutgoingSettlement[];
}

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

/** Un gestor del fondo, para elegir a nombre de quién queda el depósito. */
export interface FundDepositMember {
  user_uuid: string;
  username: string | null;
}

/**
 * Lo que el backend propone para registrar un comprobante como depósito al fondo.
 *
 * Nada se teclea: monto, moneda y referencia salen del comprobante; el fondo, del canal por
 * el que llegó; y el gestor, de quién lo mandó. Los dos últimos son propuestas — el pago 4928
 * llegó por el chat de Dionis y su depósito es de Diohandres.
 */
export interface FundDepositSuggestion {
  payment_id: number;
  table: 'incoming' | 'outgoing';
  amount: number | null;
  currency: string | null;
  provider: string | null;
  reference: string | null;
  fund_group_uuid: string | null;
  fund_group_name: string | null;
  fund_currency: string | null;
  user_uuid: string | null;
  username: string | null;
  members: FundDepositMember[];
}

