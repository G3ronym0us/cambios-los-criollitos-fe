export enum MovementType {
  DEPOSIT = 'deposit',
  EXCHANGE = 'exchange',
  PERSONAL = 'personal',
  ADJUSTMENT = 'adjustment',
}

export interface FundGroup {
  uuid: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
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
}

export interface CreateFundGroup {
  name: string;
  description?: string;
}

export interface AddFundMember {
  user_uuid: string;
  is_fund_manager?: boolean;
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
