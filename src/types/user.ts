// User Types

export interface UserData {
  uuid: string;
  username: string;
  email: string;
  full_name?: string;
  role: string;
  role_display?: string;
  is_active: boolean;
  is_verified: boolean;
  can_receive_commission: boolean;
  phone_number?: string;
  bio?: string;
  avatar_url?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface CommissionUserResponse {
  uuid: string;
  username: string;
  full_name?: string;
  email: string;
  can_receive_commission: boolean;
  is_active: boolean;
  role?: string;
  created_at: string;
}

export interface CommissionUserUpdate {
  can_receive_commission: boolean;
}

export interface CommissionUserList {
  users: CommissionUserResponse[];
  total: number;
  page: number;
  per_page: number;
}

export interface UserFilters {
  page?: number;
  per_page?: number;
  skip?: number;
  limit?: number;
  active_only?: boolean;
}

export interface UserCreate {
  username: string;
  email: string;
  full_name: string;
  password: string;
  role: string;
  is_active?: boolean;
}

export interface UserUpdate {
  full_name?: string;
  email?: string;
  is_active?: boolean;
  role?: string;
  phone_number?: string;
  bio?: string;
}

export type UserRole = 'user' | 'moderator' | 'root';

