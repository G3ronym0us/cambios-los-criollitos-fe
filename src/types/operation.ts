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
  // Valor del trato: lo que entrega el cliente, con sus equivalentes.
  amount: number | null;
  currency: string | null;
  // Cuánto cubren ya sus comprobantes de salida, y cuánto falta.
  delivered_amount: number | null;
  pending_amount: number | null;
  amount_usdt: number | null;
  usdt_rate: number | null;
  bcv_amount: number | null;
  bcv_rate: number | null;
  valuation_at: string | null;
  // Cotización prometida (par + montos + tasa).
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
  // Nombre del beneficiario dicho en el mensaje ("a yelitza"), aunque no tenga cuenta
  // guardada todavía; `beneficiary_account_uuid` sólo está seteado si ya se resolvió a una
  // cuenta de la libreta del cliente. `beneficiary_ambiguous` = había varias con ese nombre.
  beneficiary_alias: string | null;
  beneficiary_account_uuid: string | null;
  beneficiary_ambiguous: boolean;
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

// ---- Emparejamiento comprobante ↔ operación ----
// La regla vive en el backend (app/services/operation_match_service.py), compartida con el
// matcher automático del bot. El front solo consume el resultado: nada de umbrales aquí.

export interface OperationMatchScore {
  uuid: string;
  /** Esperado − pagado, con signo: se pinta como "+43" / "-7". */
  delta: number | null;
  relative: number | null;
  currency_matches: boolean;
  amount_score: number;
  time_score: number;
  score: number;
  /** Calza en monto y moneda: candidata legítima. */
  within_tolerance: boolean;
}

export interface OperationSuggestion {
  uuid: string;
  /** Gana con claridad; solo entonces el selector la preselecciona. */
  confident: boolean;
}

export interface OperationMatchResponse {
  suggestion: OperationSuggestion | null;
  candidates: OperationMatchScore[];
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

/** Un destino del margen de una operación: un fondo, o el propio cliente. */
export type ProfitDestinationType = 'FUND' | 'CLIENT';

export interface ProfitAllocation {
  uuid: string;
  destination_type: ProfitDestinationType;
  fund_group_uuid: string | null;
  client_uuid: string | null;
  destination_name: string | null;
  percentage: number;
  amount_usdt: number | null;
  approved_by_uuid: string | null;
  approved_at: string | null;
  notes: string | null;
}

export interface ProfitAllocationList {
  operation_uuid: string;
  /** Lo que se le cobró al cliente. */
  charged_percentage: number | null;
  allocated_percentage: number;
  /** Lo cobrado menos lo repartido; negativo = se repartió de más. */
  unallocated_percentage: number;
  value_usdt: number | null;
  allocations: ProfitAllocation[];
}

export interface ProfitAllocationInput {
  destination_type: ProfitDestinationType;
  fund_group_uuid?: string | null;
  client_uuid?: string | null;
  percentage: number;
  notes?: string | null;
}

/** Un comprobante de salida que podría cubrir la operación, con lo que aún tiene libre. */
export interface CoverageCandidate {
  payment_id: number;
  amount: number | null;
  free_amount: number;
  currency: string | null;
  provider: string | null;
  reference: string | null;
  created_at: string;
}

/** Una parte ya cubierta: qué comprobante, cuánto del valor y a qué tasa. */
export interface CoverageSettlement {
  payment_id: number;
  settled_amount: number;
  rate: number | null;
  amount: number | null;
  currency: string | null;
}

/**
 * Cobertura de una operación: qué la cubre ya y con qué podría terminar de cubrirse.
 * Es el espejo de `OutgoingSettlementSummary`, anclado en la operación en vez de en el pago.
 */
export interface OperationCoverage {
  operation_uuid: string;
  value: number;
  value_currency: string;
  delivered: number;
  uncovered: number | null;
  uncovered_reason: string | null;
  pending: number;
  reference_rate: number | null;
  settlements: CoverageSettlement[];
  candidates: CoverageCandidate[];
  /** El subconjunto de candidatos que cuadra con lo que falta, o vacío si ninguno lo hace. */
  suggestion: number[];
}

export type UncoveredReason = 'CASH' | 'OTHER_CHANNEL' | 'BALANCE' | 'ADJUSTMENT';

