export enum MovementType {
  DEPOSIT = 'DEPOSIT',
  /** La pata que SALE del fondo: se le pagó al cliente. */
  EXCHANGE = 'EXCHANGE',
  /** La pata que ENTRA al fondo: el cliente nos pagó. Suma posición, como un depósito. */
  EXCHANGE_IN = 'EXCHANGE_IN',
  PERSONAL = 'PERSONAL',
  ADJUSTMENT = 'ADJUSTMENT',
}

/** Miembro tal como lo devuelve el backend dentro de FundGroupResponse.members (forma plana). */
export interface FundGroupMemberFlat {
  uuid: string;
  user_uuid: string;
  username: string | null;
  is_fund_manager: boolean;
  /** Parte de la ganancia del fondo que le toca (los socios del grupo suman 100). */
  profit_share_percentage?: number | null;
  whatsapp_phone?: string | null;
}

export interface FundGroup {
  uuid: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  currency?: string;
  whatsapp_group_jid?: string | null;
  /** Cuánto del margen cobrado al cliente se queda el fondo. null = todo lo cobrado. */
  default_profit_percentage?: number | null;
  members?: FundGroupMemberFlat[];
}

export interface FundGroupMember {
  uuid: string;
  group_uuid: string;
  user_uuid: string;
  user: {
    uuid: string;
    username: string;
    full_name?: string;
  };
  is_fund_manager: boolean;
  joined_at: string;
}

export interface FundMovement {
  uuid: string;
  group_uuid: string;
  user_uuid: string;
  // Gestor/moderador del movimiento: el backend lo envía plano en `username`
  // (no como objeto anidado). `user` queda como legacy opcional.
  username?: string | null;
  user?: {
    uuid: string;
    username: string;
    full_name?: string;
  };
  // Quién registró el movimiento (puede diferir del gestor).
  recorded_by_uuid?: string | null;
  recorded_by_username?: string | null;
  movement_type: MovementType;
  amount: number;
  currency: string;
  amount_usdt: number;
  usdt_rate?: number | null;
  movement_date: string;
  notes?: string | null;
  transaction_uuid?: string | null;
  // Cliente de la operación ligada (solo EXCHANGE) y ganancia de su transacción.
  client_name?: string | null;
  profit_percentage?: number | null;
  profit_amount?: number | null;
  profit_amount_usdt?: number | null;
  /** Acumulados hasta este movimiento (extracto), sobre todo el historial del grupo. */
  running_balance_usdt?: number | null;
  running_profit_usdt?: number | null;
  /** Anulación: esta fila anula a otra, o ya fue anulada por otra. */
  is_reversal?: boolean;
  is_reversed?: boolean;
  reverses_movement_uuid?: string | null;
  reversed_by_movement_uuid?: string | null;
  reversed_at?: string | null;
  created_at: string;
}

export interface MemberBalance {
  user_uuid: string;
  username: string;
  full_name?: string;
  total_deposited_usdt: number;
  total_outflow_usdt: number;
  position_usdt: number;
}

export interface GroupBalance {
  group_uuid: string;
  group_name: string;
  total_position_usdt: number;
  total_profit_usdt: number;
  available_funds_usdt: number;
  by_member: MemberBalance[];
}

export interface UserPosition {
  user_uuid: string;
  username: string;
  group_name: string;
  is_fund_manager: boolean;
  total_deposited: number;
  total_deposited_usdt: number;
  total_outflow: number;
  total_outflow_usdt: number;
  position: number;
  position_usdt: number;
  currency: string;
}

export interface FundMovementFilters {
  movement_type?: MovementType;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}

/** Acumulados de TODO lo que cae bajo el filtro, no de la página que se está viendo. */
export interface FundMovementTotals {
  deposits_usdt: number;
  deposits_count: number;
  exchanges_usdt: number;
  exchanges_count: number;
  personal_usdt: number;
  adjustments_usdt: number;
  /** Entradas menos salidas (cambios + personales). */
  net_usdt: number;
  /** Ganancia dejada por los movimientos que vienen de una operación. */
  profit_usdt: number;
  profit_count: number;
}

export interface FundMovementsResponse {
  movements: FundMovement[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  totals?: FundMovementTotals | null;
}

/** Dónde cae un movimiento dentro del historial, para poder saltar hasta él. */
export interface FundMovementLocation {
  movement_uuid: string;
  group_uuid?: string | null;
  page?: number | null;
  /** false = los filtros actuales lo dejan fuera; no hay página a la que ir. */
  found: boolean;
}

export interface CreateFundGroup {
  name: string;
  currency: string;
  description?: string;
  whatsapp_group_jid?: string | null;
}

export interface UpdateFundGroup {
  whatsapp_group_jid?: string | null;
  clear_whatsapp_group_jid?: boolean;
  default_profit_percentage?: number | null;
  clear_default_profit_percentage?: boolean;
}

export interface AddFundMember {
  user_uuid: string;
  is_fund_manager?: boolean;
  profit_share_percentage?: number | null;
  whatsapp_phone?: string | null;
}

export interface UpdateFundMember {
  is_fund_manager?: boolean;
  profit_share_percentage?: number | null;
  whatsapp_phone?: string | null;
  clear_whatsapp_phone?: boolean;
}

export interface CreateFundMovement {
  group_uuid: string;
  user_uuid: string;
  movement_type: MovementType;
  amount: number;
  currency: string;
  amount_usdt: number;
  usdt_rate?: number;
  movement_date: string;
  notes?: string;
}

// Depósito detectado por el bot (gestor sube comprobante al grupo), pendiente de confirmar.
export interface PendingDeposit {
  uuid: string;
  group_uuid: string | null;
  group_name: string | null;
  // GROUP: comprobante que el gestor subió al grupo (lo detectó el bot).
  // MANUAL: lo cargó un operador porque el bot no lo detectó.
  origin: 'GROUP' | 'MANUAL' | null;
  created_by_username: string | null;
  // Pago entrante que este comprobante estaría duplicando (dinero ya contabilizado
  // como pago del cliente). Confirmarlo exige override_duplicate.
  source_incoming_payment_id: number | null;
  source_incoming_payment_phone: string | null;
  // Comprobante SALIENTE que el operador marcó como capital del fondo.
  origin_outgoing_payment_id?: number | null;
  detected_user_uuid: string | null;
  detected_username: string | null;
  amount: number | null;
  currency: string | null;
  provider: string | null;
  reference: string | null;
  raw_text: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  confirmed_movement_uuid: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ConfirmPendingDeposit {
  deposit_method: string;
  amount?: number;
  currency?: string;
  user_uuid?: string;
  reference?: string;
  notes?: string;
  override_duplicate?: boolean;
}

/**
 * Alta manual de un depósito pendiente. Es la única forma de registrar un depósito que el
 * bot no detectó: `POST /funds/movements` ya no acepta DEPOSIT.
 */
export interface CreatePendingDeposit {
  group_uuid: string;
  user_uuid: string;
  amount: number;
  currency: string;
  provider?: string;
  reference?: string;
  notes?: string;
}
