// Transaction Status Enum
export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED'
}

// Profit Split
export interface ProfitSplitData {
  uuid: string;
  transaction_uuid: string;
  user_uuid: string;
  profit_percentage: number;
  profit_amount: number;
  created_at: string;
  user?: {
    uuid: string;
    username: string;
    email: string;
  };
}

export interface ProfitSplitCreate {
  user_uuid: string;
  profit_percentage: number;
}

// Transaction
export interface TransactionData {
  uuid: string;
  currency_pair_uuid: string;
  pair_symbol: string;
  from_currency: string;
  to_currency: string;
  from_amount: number;
  to_amount: number;
  exchange_rate: number;
  profit_amount: number;
  total_profit_percentage: number;
  description?: string;
  transaction_type?: string;
  status: TransactionStatus;
  user_uuid?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  profit_splits: ProfitSplitData[];
  creator?: {
    uuid: string;
    username: string;
    email: string;
  };
}

export interface CreateTransactionData {
  currency_pair_uuid: string;
  from_amount: number;
  to_amount: number;
  exchange_rate: number;
  total_profit_percentage?: number;
  description?: string;
  profit_splits?: ProfitSplitCreate[];
  commission_config_uuid?: string;
}

export interface UpdateTransactionData {
  currency_pair_uuid?: string;
  description?: string;
  status?: TransactionStatus;
  total_profit_percentage?: number;
  profit_splits?: ProfitSplitCreate[];
}

// Reports
export interface UserProfitReport {
  user_uuid: string;
  username: string;
  email: string;
  total_profit: number;
  transaction_count: number;
  transactions: Array<{
    transaction_uuid: string;
    from_currency: string;
    to_currency: string;
    profit_amount: number;
    created_at: string;
  }>;
}

export interface PairProfitDistribution {
  currency_pair: string;
  total_profit: number;
  transaction_count: number;
}

export interface UserProfitDistribution {
  user_uuid: string;
  username: string;
  total_profit: number;
  transaction_count: number;
}

export interface ProfitSummary {
  total_profit: number;
  total_transactions: number;
  by_currency_pair: PairProfitDistribution[];
  by_user: UserProfitDistribution[];
}

export interface TransactionStats {
  total_transactions: number;
  total_profit: number;
  completed_transactions: number;
  pending_transactions: number;
  cancelled_transactions: number;
  failed_transactions: number;
  average_profit: number;
}

// API Response Types
export interface TransactionsResponse {
  transactions: TransactionData[];
  total: number;
  page: number;
  per_page: number;
}

// Filter Types
export interface TransactionFilters {
  status_filter?: TransactionStatus;
  from_currency?: string;
  to_currency?: string;
  user_uuid?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
}
