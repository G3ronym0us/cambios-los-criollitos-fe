'use client';

import { useState } from 'react';
import { Inbox, MessageSquareWarning, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatCard } from '@/components/shared/StatCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VERDICT_LABEL, type AnalysisData } from '@/types/analysis';
import { useAnalyses } from './_hooks/useAnalyses';
import { AnalysisDetail } from './_components/AnalysisDetail';

/**
 * Pantalla "Análisis": qué leyó el bot en cada mensaje y qué dedujo.
 *
 * Reemplaza el ir y venir de capturas de pantalla. Hasta ahora, cuando una cotización salía
 * mal, la única forma de revisarla era que el operador fotografiara el chat; acá está el
 * texto exacto y la ventana que el analizador tuvo en cuenta.
 *
 * Abre filtrada por la cola de revisión —lo que parecía una operación y no produjo ninguna—
 * porque es lo que hay que hacer, no todo lo que pasó.
 */
export default function AnalysesPage() {
  const { state, actions } = useAnalyses();
  const [selected, setSelected] = useState<AnalysisData | null>(null);

  const nuevos = state.items.filter((i) => i.context?.untracked).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Análisis"
        description="Qué leyó el bot en cada mensaje y qué dedujo. Para revisar una cotización que salió mal sin pedir capturas."
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={Inbox}
          label="Por revisar"
          value={state.stats?.pending_review ?? 0}
          accent="warning"
          hint={`últimos ${state.days} días`}
        />
        <StatCard icon={UserPlus} label="De números nuevos" value={nuevos} accent="info" />
        <StatCard
          icon={MessageSquareWarning}
          label="Analizados"
          value={state.stats?.total ?? 0}
          accent="muted"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar en el texto de los mensajes…"
          value={state.search}
          onChange={(e) => actions.setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button
          variant={state.onlyPending ? 'default' : 'outline'}
          size="sm"
          onClick={() => actions.setOnlyPending(!state.onlyPending)}
        >
          Solo por revisar
        </Button>
        <Button
          variant={state.untrackedOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => actions.setUntrackedOnly(!state.untrackedOnly)}
        >
          Números nuevos
        </Button>
        {[7, 30, 90].map((d) => (
          <Button
            key={d}
            variant={state.days === d ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => actions.setDays(d)}
          >
            {d}d
          </Button>
        ))}
        {state.hasActiveFilters ? (
          <Button variant="ghost" size="sm" onClick={actions.resetFilters}>
            Limpiar
          </Button>
        ) : null}
        <span className="ml-auto text-sm text-muted-foreground">
          {state.items.length} de {state.total}
        </span>
      </div>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : state.loading ? (
        <LoadingState />
      ) : state.items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Nada por revisar"
          description="Ningún mensaje quedó sin resolver en este período."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Cuándo</th>
                <th className="px-3 py-2 font-medium">Número</th>
                <th className="px-3 py-2 font-medium">Último mensaje</th>
                <th className="px-3 py-2 font-medium">Dedujo</th>
                <th className="px-3 py-2 font-medium">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {state.items.map((a) => {
                const last = a.messages[a.messages.length - 1] ?? '';
                const extra = a.messages.length - 1;
                return (
                  <tr
                    key={a.uuid}
                    onClick={() => setSelected(a)}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                      {a.created_at
                        ? new Date(a.created_at).toLocaleString('es-VE', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span className="font-medium">{a.client_phone}</span>
                      {a.context?.untracked ? (
                        <Badge variant="destructive" className="ml-2">
                          nuevo
                        </Badge>
                      ) : null}
                    </td>
                    <td className="max-w-[22rem] px-3 py-2">
                      <span className="line-clamp-1 break-all">{last.replace(/\n/g, ' · ')}</span>
                      {/* Que la fila avise cuántos mensajes más pesaron en la lectura: sin
                          eso, un monto "de la nada" parece un error del bot. */}
                      {extra > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          +{extra} mensaje{extra === 1 ? '' : 's'} de contexto
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {a.output?.amount != null
                        ? `${a.output.amount} ${a.output.fromCurrency ?? ''}`
                        : (a.output?.intent ?? '—')}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <Badge variant="outline">{VERDICT_LABEL[a.verdict] ?? a.verdict}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AnalysisDetail analysis={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
