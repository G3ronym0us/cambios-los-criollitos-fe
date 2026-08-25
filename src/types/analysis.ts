/**
 * Lo que el bot leyó en cada mensaje y lo que dedujo de él.
 *
 * Existe para poder revisar una cotización que salió mal sin pedirle una captura al
 * operador: acá está el texto exacto que llegó y la ventana completa que el analizador tuvo
 * en cuenta al decidir.
 */

/** Qué pasó con la operación que este análisis produjo (o no). Lo deriva el backend. */
export type AnalysisVerdict =
  | 'correct'
  | 'superseded'
  | 'cancelled'
  | 'open'
  | 'ghost_quote'
  | 'op_gone'
  | 'no_action';

export interface AnalysisOutput {
  intent?: string | null;
  fromCurrency?: string | null;
  toCurrency?: string | null;
  amount?: number | null;
  amountSide?: string | null;
  paymentInfo?: string | null;
  marginOverride?: number | null;
  beneficiaryAlias?: string | null;
}

export interface AnalysisContext {
  /** Campos que la ficha del cliente estaba esperando: cambian cómo se lee el mismo número. */
  awaiting?: string[];
  history_size?: number;
  self_contained?: boolean;
  contributes?: boolean;
  /** El número todavía no es cliente. */
  untracked?: boolean;
  /** Si parecía un intento de operación: decide la retención y la cola de revisión. */
  looks_transactional?: boolean;
  /** Sólo en filas del backfill: la ventana se reconstruyó del historial del chat. */
  window_source?: 'chat_history' | 'single_message';
  message_type?: string;
  backfill?: boolean;
}

export interface AnalysisOperation {
  operation_uuid: string;
  status: string | null;
  pair_symbol: string | null;
  from_amount: number | null;
  to_amount: number | null;
  amount_side: string | null;
  bcv_usd: number | null;
  quoted_at: string | null;
}

export interface AnalysisData {
  uuid: string;
  created_at: string | null;
  client_phone: string;
  /** La ventana completa, del más viejo al más reciente. Sin ella la fila se malinterpreta. */
  messages: string[];
  context: AnalysisContext | null;
  default_pair_symbol: string | null;
  analyzer: string;
  output: AnalysisOutput | null;
  verdict: AnalysisVerdict;
  operation: AnalysisOperation | null;
  replacement: AnalysisOperation | null;
  label: AnalysisOutput | null;
  label_source: string | null;
}

export interface AnalysisPage {
  items: AnalysisData[];
  total: number;
  skip: number;
  limit: number;
}

export interface AnalysisStats {
  days: number;
  total: number;
  by_verdict: Record<string, number>;
  verdict_meanings: Record<string, string>;
  pending_review: number;
}

export interface AnalysisQuery {
  days?: number;
  onlyPending?: boolean;
  untracked?: boolean;
  phone?: string;
  search?: string;
  limit?: number;
  skip?: number;
}

/** Etiqueta corta para la tabla; el significado largo lo trae `verdict_meanings`. */
export const VERDICT_LABEL: Record<AnalysisVerdict, string> = {
  correct: 'Correcto',
  superseded: 'Leyó mal',
  cancelled: 'Cancelada',
  open: 'Abierta',
  ghost_quote: 'Sin operación',
  op_gone: 'Op borrada',
  no_action: 'Sin acción',
};
