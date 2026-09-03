// Agregado de la home de admin (GET /admin/overview). Un viaje, recortado por rol: el
// backend decide qué bloques manda (ROOT ve `alerts`/`clients`, MODERATOR no) y qué
// bloque falló al calcularse (llega en `null` y su nombre aparece en `errors`).

export type OverviewBlockKey = 'payments' | 'operations' | 'me' | 'alerts' | 'clients';

export interface OverviewPayments {
  needs_attention: number;
  unassigned_amount: number;
  unassigned_currency: string;
  unassigned_truncated: boolean;
  unlinked: number;
  to_review: number;
  partially_split: number;
  received_today: number;
  reconciled_today: number;
}

export interface OverviewOperations {
  to_settle: number;
  to_settle_amount: number;
  to_settle_covered: number;
  to_deliver: number;
  to_deliver_oldest_at: string | null;
  expiring: number;
  expiring_next_at: string | null;
  completed_today: number;
  completed_daily_avg_week: number;
}

export interface OverviewMe {
  profit_today: number;
  profit_currency: string;
  transactions_today: number;
}

export interface OverviewAlertTop {
  pair_symbol: string;
  manual_rate: number;
  auto_rate: number;
  deviation_pct: number;
  stale_hours: number | null;
}

export interface OverviewAlerts {
  unseen: number;
  top: OverviewAlertTop[];
}

export interface OverviewClientTotal {
  currency: string;
  amount: number;
}

export interface OverviewClientOldest {
  name: string;
  waiting_days: number;
  amount: number;
  currency: string;
}

export interface OverviewClients {
  pending_count: number;
  totals: OverviewClientTotal[];
  oldest: OverviewClientOldest[];
}

export interface AdminOverview {
  generated_at: string;
  role: 'ROOT' | 'MODERATOR';
  // Bloques que tocaban por rol pero fallaron al calcularse: llegan en `null`.
  errors: OverviewBlockKey[];
  payments: OverviewPayments | null;
  operations: OverviewOperations | null;
  me: OverviewMe | null;
  // Ausente (no la clave) para MODERATOR — es la señal de rol, no CSS.
  alerts?: OverviewAlerts | null;
  clients?: OverviewClients | null;
}
