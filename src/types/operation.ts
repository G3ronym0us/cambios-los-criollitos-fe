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
  /**
   * El hueco declarado sin comprobante: lo entregado o cobrado en efectivo.
   *
   * **No está en `delivered_amount`**, que sólo cuenta comprobantes, pero sí está
   * descontado de `pending_amount`. Cualquier pantalla que hable de «cuánto se ha cubierto»
   * tiene que sumar los dos: si no, una operación de 75 con 40 marcados en efectivo se lee
   * como si valiera 35 desde el principio y los 40 no aparecen en ninguna parte.
   */
  uncovered_amount: number | null;
  uncovered_reason: string | null;
  pending_amount: number | null;
  /**
   * La OTRA pata, y sólo dice algo si `settles_in_cash`: cuánto del efectivo del cliente ya
   * está recogido, y cuánto falta.
   *
   * `pending_amount` mide lo NUESTRO —lo que no hemos cubierto— y en un par de efectivo
   * llega a cero en cuanto se vincula el comprobante en bolívares, sin que nadie haya
   * recogido un dólar. Sin estos dos campos la pantalla no puede distinguir «ya está
   * pagada» de «ya está cobrada», que es lo que la hacía dar por saldado lo que no lo está.
   * Léelos siempre por `outstandingAmount()`, nunca a mano.
   */
  collected_amount: number | null;
  to_collect: number | null;
  /** Cuántos comprobantes de salida cubren la operación. */
  payments_count: number;
  /**
   * Cuándo llegó el dinero del cliente: su primer comprobante ENTRANTE.
   *
   * `null` = todavía no ha llegado, y entonces no le debemos nada por mucho que falte por
   * entregar: lo que hay es un trato a medio armar, no una deuda. Es también la fecha por
   * la que se ordena la cola de entregas — `created_at` es cuándo se registró el trato, no
   * cuándo entró la plata, y las operaciones que el operador arma a mano nacen hoy aunque
   * el dinero llevara una semana adentro.
   */
  first_incoming_payment_at: string | null;
  /**
   * Cuándo llegó el ÚLTIMO comprobante ENTRANTE del cliente — el más reciente, no el
   * primero. Distinto a propósito de `first_incoming_payment_at`: ese mide antigüedad
   * (desde cuándo espera la operación); este es el hecho más reciente, lo que hay que
   * enseñar como «fecha del pago» cuando el cliente pagó en varias partes. `null` en los
   * mismos casos que el anterior (sin entrante, p.ej. `VIA_PARTNER` o un par en efectivo).
   */
  last_incoming_payment_at: string | null;
  /**
   * Su par se cambia en efectivo (`CurrencyPair.settles_in_cash`).
   *
   * Entonces `first_incoming_payment_at` vacío NO dice que el cliente no haya pagado: dice
   * que de un billete no hay comprobante que adjuntar. Y lo que quede sin cuadrar se lee al
   * revés — los bolívares ya salieron y lo que falta es el efectivo del cliente.
   */
  settles_in_cash: boolean;
  /**
   * La tasa que resultó de los comprobantes (entregado ÷ valor). `rate_used` es la que se
   * COTIZÓ; la desviación entre ambas es lo que la columna de cobertura viene a mostrar.
   * `null` mientras no haya nada entregado.
   */
  real_rate: number | null;
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
  /** El total tras los filtros, no el tamaño de la página. */
  total: number;
  page: number;
  limit: number | null;
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

/**
 * Lo que manda el cajón de "vincular pago" a `POST /operations/match`: los mismos filtros de
 * `GET /operations` (`phone`/`search`/`status`/`page`/`limit`) más `order_by`, que reemplaza a
 * los tres botones que antes ordenaban en el navegador ("sugerida"/"monto"/"hora").
 *
 * `table` se tipa como string literal en vez de importar `PaymentTable` de `types/payment.ts`
 * para no crear un ciclo de módulos (`payment.ts` ya importa `OperationStatus` de aquí).
 */
export interface OperationRankRequest {
  payment_id: number;
  table: 'incoming' | 'outgoing';
  phone?: string;
  search?: string;
  status?: string;
  order_by: 'suggested' | 'amount' | 'time';
  page: number;
  limit: number;
}

/** Una candidata lista para pintar: la operación entera junto a su puntaje contra el comprobante. */
export interface OperationMatchItem {
  operation: OperationData;
  score: OperationMatchScore;
}

export interface OperationRankResponse {
  suggestion: OperationSuggestion | null;
  items: OperationMatchItem[];
  /** El total tras el filtro (no el tamaño de la página) — para saber si hay más que cargar. */
  total: number;
  page: number;
  limit: number;
}

export interface OperationStats {
  pending: number;
  completed: number;
  quoted: number;
  cancelled: number;
  completed_today: number;
  // Lo accionable: cuentan TODO, no la página.
  to_settle: number;
  to_settle_amount: number;
  to_deliver: number;
  to_deliver_oldest_at: string | null;
  without_client: number;
  expiring: number;
  expiring_next_at: string | null;
}

export interface OperationFilters {
  status?: string;
  delivery_status?: string;
  scenario?: string;
  /** Lo que hace falta hacer: settle | deliver | client | expiring | action. */
  needs?: string;
  phone?: string;
  /** Nombre o teléfono del cliente; lo resuelve el servidor. */
  search?: string;
  page?: number;
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

