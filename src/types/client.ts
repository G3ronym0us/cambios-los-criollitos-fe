// Cliente del bot (whatsapp_clients) visto como "cliente" del negocio.
// No confundir con UserData (operadores/socios del sistema, con login y rol).

export interface ClientData {
  uuid: string;
  phone: string;
  display_name: string | null;
  preferred_pair_uuid: string | null;
  preferred_pair_symbol: string | null;
  is_tracked: boolean;
  is_blocked: boolean;
  is_usdt_authorized: boolean;
  last_seen_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ClientListResponse {
  items: ClientData[];
  total: number;
  skip: number;
  limit: number;
}

export interface ClientUpdate {
  display_name?: string | null;
  is_tracked?: boolean;
  is_blocked?: boolean;
  is_usdt_authorized?: boolean;
  preferred_pair_uuid?: string | null;
}

export interface ClientFilters {
  skip?: number;
  limit?: number;
  search?: string;
  is_blocked?: boolean;
  is_tracked?: boolean;
}
