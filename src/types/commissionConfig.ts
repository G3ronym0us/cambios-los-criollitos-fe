export interface CommissionConfigSplit {
  uuid: string;
  user_uuid: string;
  configuration_uuid: string;
  username?: string;
  user_full_name?: string;
  percentage: number;
  created_at: string;
}

export interface CommissionConfiguration {
  uuid: string;
  currency_pair_uuid: string;
  pair_symbol?: string;
  name: string;
  description?: string;
  total_percentage: number;
  is_active: boolean;
  created_by_user_uuid?: string;
  splits: CommissionConfigSplit[];
  created_at: string;
  updated_at: string;
}

export interface CommissionConfigCreate {
  currency_pair_uuid: string;
  name: string;
  description?: string;
  total_percentage: number;
  splits: {
    user_uuid: string;
    percentage: number;
  }[];
}

export interface CommissionConfigUpdate {
  name?: string;
  description?: string;
  total_percentage?: number;
  is_active?: boolean;
  splits?: {
    user_uuid: string;
    percentage: number;
  }[];
}

export interface CommissionConfigListByPair {
  currency_pair_uuid: string;
  pair_symbol: string;
  configurations: CommissionConfiguration[];
  total: number;
}

export interface CommissionConfigFilters {
  page?: number;
  per_page?: number;
  currency_pair_uuid?: string;
  only_active?: boolean;
}
