'use client';

import { Badge } from '@/components/ui/badge';
import { SidePanel } from '@/components/shared/SidePanel';
import { VERDICT_LABEL, type AnalysisData } from '@/types/analysis';

/**
 * El detalle de un análisis: qué llegó, qué se leyó y qué salió.
 *
 * La ventana completa es lo primero porque es lo que explica el resto: el analizador no
 * decidió sobre el último mensaje sino sobre el conjunto, y una fila leída sin ella lleva a
 * conclusiones equivocadas ("¿de dónde sacó ese monto?" suele responderse dos mensajes
 * antes).
 */

interface Props {
  analysis: AnalysisData | null;
  onClose: () => void;
}

function Campo({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

export function AnalysisDetail({ analysis, onClose }: Props) {
  if (!analysis) return null;
  const { output, context, operation } = analysis;
  const awaiting = context?.awaiting ?? [];

  return (
    <SidePanel open={analysis !== null} onOpenChange={(o) => !o && onClose()}>
      <div className="space-y-6">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{analysis.client_phone}</h2>
            <Badge variant="outline">{VERDICT_LABEL[analysis.verdict] ?? analysis.verdict}</Badge>
            {context?.untracked ? <Badge variant="destructive">No trackeado</Badge> : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {analysis.created_at ? new Date(analysis.created_at).toLocaleString('es-VE') : '—'}
            {analysis.analyzer !== 'heuristic-v1' ? ` · ${analysis.analyzer}` : ''}
          </p>
        </header>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">
            Lo que el bot leyó
            <span className="ml-2 font-normal text-muted-foreground">
              {analysis.messages.length} mensaje{analysis.messages.length === 1 ? '' : 's'}
            </span>
          </h3>
          <ol className="space-y-1.5">
            {analysis.messages.map((m, i) => (
              <li
                key={i}
                className={
                  'whitespace-pre-wrap break-words rounded-md border px-3 py-2 text-sm ' +
                  (i === analysis.messages.length - 1
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border bg-muted/40 text-muted-foreground')
                }
              >
                {m}
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted-foreground">
            El último es el que disparó el análisis; los anteriores son el contexto que se
            tuvo en cuenta.
          </p>
        </section>

        <section>
          <h3 className="mb-1 text-sm font-semibold">Lo que dedujo</h3>
          <div className="divide-y divide-border">
            <Campo label="Intención" value={output?.intent} />
            <Campo label="Monto" value={output?.amount} />
            <Campo
              label="Par"
              value={
                output?.fromCurrency || output?.toCurrency
                  ? `${output?.fromCurrency ?? '?'} → ${output?.toCurrency ?? '?'}`
                  : null
              }
            />
            <Campo label="Lado" value={output?.amountSide} />
            <Campo label="Margen" value={output?.marginOverride} />
            <Campo label="Beneficiario" value={output?.beneficiaryAlias} />
            <Campo label="Datos de pago" value={output?.paymentInfo} />
          </div>
        </section>

        <section>
          <h3 className="mb-1 text-sm font-semibold">Contexto al analizar</h3>
          <div className="divide-y divide-border">
            <Campo label="Par por defecto" value={analysis.default_pair_symbol} />
            {/* Los campos pendientes son la clave de la mitad de las lecturas raras: un
                número que llena un campo esperado no se cuenta como monto. */}
            <Campo
              label="Ficha esperaba"
              value={awaiting.length ? awaiting.join(', ') : 'nada pendiente'}
            />
            <Campo label="Mensaje completo en sí mismo" value={context?.self_contained ? 'sí' : null} />
            {context?.window_source === 'single_message' ? (
              <Campo label="⚠️ Ventana" value="no se pudo reconstruir (mensaje suelto)" />
            ) : null}
          </div>
        </section>

        <section>
          <h3 className="mb-1 text-sm font-semibold">Lo que salió</h3>
          {operation ? (
            <div className="divide-y divide-border">
              <Campo label="Estado" value={operation.status} />
              <Campo label="Par" value={operation.pair_symbol} />
              <Campo
                label="Montos"
                value={`${operation.from_amount ?? '—'} → ${operation.to_amount ?? '—'}`}
              />
              <Campo label="Valor BCV" value={operation.bcv_usd} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No nació ninguna operación de este mensaje.
            </p>
          )}
        </section>
      </div>
    </SidePanel>
  );
}
