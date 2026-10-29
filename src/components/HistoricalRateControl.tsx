'use client';

import { useState } from 'react';
import { ChevronDown, History, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { useHistoricalRate } from '@/hooks/useHistoricalRate';

export default function HistoricalRateControl({ history }: { history: ReturnType<typeof useHistoricalRate> }) {
  const [dateTime, setDateTime] = useState('');
  const [expanded, setExpanded] = useState(false);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const formatDate = (value: string) => new Date(value).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <section aria-labelledby="historical-rate-title" className="mb-4 space-y-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="historical-rate-title" className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <History className="h-4 w-4 text-primary" aria-hidden />
          {history.at ? 'Tasa histórica' : 'Tasa actual'}
        </h2>
        <button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-controls="historical-form" className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {history.at ? 'Cambiar fecha y hora' : 'Consultar tasa histórica'}
          <ChevronDown className={`h-4 w-4 ${expanded ? 'rotate-180' : ''}`} aria-hidden />
        </button>
      </div>
      {expanded && <form id="historical-form" noValidate onSubmit={event => { event.preventDefault(); history.load(dateTime); }} className="space-y-2 border-t border-border pt-3">
        <label htmlFor="historical-at" className="block text-sm font-medium text-foreground">Fecha y hora</label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            id="historical-at"
            type="datetime-local"
            step={60}
            value={dateTime}
            onChange={event => setDateTime(event.target.value)}
            aria-describedby={`historical-help${history.error ? ' historical-error' : ''}`}
            aria-invalid={!!history.error}
            className="min-h-11 min-w-0 w-full flex-1 rounded-lg border border-input bg-card px-3 py-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" disabled={history.loading} aria-busy={history.loading} className="min-h-11 shrink-0">
            {history.loading ? 'Consultando…' : 'Cargar tasa histórica'}
          </Button>
        </div>
        <p id="historical-help" className="text-xs leading-relaxed text-muted-foreground">
          Hora local ({zone}). Se aplicará la última tasa registrada hasta ese momento para el par seleccionado.
        </p>
      </form>}
      {history.error && <p id="historical-error" role="alert" className="rounded-lg border border-destructive/30 bg-card px-3 py-2 text-sm text-destructive">{history.error}</p>}
      {history.at && (
        <div className="space-y-2 border-t border-primary/20 pt-3">
          <div role="status" aria-live="polite" className="space-y-1 text-sm text-foreground">
            <p className="font-medium">Consulta del {formatDate(history.at)}</p>
            {history.loading ? <p>Buscando la tasa de este par…</p> : history.rate ? (
              <p className="text-xs text-muted-foreground">Tasa registrada el {formatDate(history.rate.created_at)}.</p>
            ) : null}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">El equivalente BCV y el ajuste de porcentaje están disponibles al volver a la tasa actual.</p>
          <Button type="button" variant="outline" onClick={history.reset} className="min-h-11 w-full sm:w-auto">
            <RotateCcw className="h-4 w-4" aria-hidden /> Volver a tasa actual
          </Button>
        </div>
      )}
    </section>
  );
}
