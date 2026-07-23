export enum MovementType {
  DEPOSIT = 'DEPOSIT',
  EXCHANGE = 'EXCHANGE',
  PERSONAL = 'PERSONAL',
  ADJUSTMENT = 'ADJUSTMENT',
}

/** Miembro tal como lo devuelve el backend dentro de FundGroupResponse.members (forma plana). */
export interface FundGroupMemberFlat {
  uuid: string;
  user_uuid: string;
  username: string | null;
  is_fund_manager: boolean;
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
  user: {
    uuid: string;
    username: string;
    full_name?: string;
  };
  movement_type: MovementType;
  amount: number;
  currency: string;
  amount_usdt: number;
  usdt_rate?: number | null;
  movement_date: string;
  notes?: string | null;
  transaction_uuid?: string | null;
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

export interface FundMovementsResponse {
  movements: FundMovement[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
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
}

export interface AddFundMember {
  user_uuid: string;
  is_fund_manager?: boolean;
  whatsapp_phone?: string | null;
}

export interface UpdateFundMember {
  is_fund_manager?: boolean;
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
