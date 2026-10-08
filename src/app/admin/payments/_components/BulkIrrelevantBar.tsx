'use client';

import { ListChecks, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { usePaymentSelection } from '../_hooks/usePaymentSelection';

type Selection = ReturnType<typeof usePaymentSelection>;

/**
 * El interruptor de la selección múltiple, encima de la lista. Apagada, la bandeja es la de
 * siempre: un botón. Encendida, dice qué hacer y cómo salir.
 */
export function BulkSelectToggle({ selection }: { selection: Selection }) {
  const { state, actions } = selection;

  if (!state.active) {
    return (
      <div className="flex justify-end">
        <Button variant="outline" className="h-11 sm:h-9" onClick={actions.start}>
          <ListChecks className="h-4 w-4" />
          Seleccionar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 py-2 pl-3 pr-2">
      <div className="flex min-w-0 items-start gap-2">
        <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <p className="text-xs leading-relaxed text-muted-foreground">
          <strong className="font-semibold text-foreground">Elige los pagos</strong> que quieres
          marcar como irrelevantes.{' '}
          {state.selectableCount === 0
            ? 'Ninguno de los cargados se puede marcar.'
            : 'Los ya irrelevantes, los préstamos y los acreditados al saldo no se pueden elegir.'}
        </p>
      </div>
      <Button
        variant="ghost"
        className="h-11 shrink-0 text-primary sm:h-8"
        onClick={actions.cancel}
        disabled={state.working}
      >
        <X className="h-4 w-4" />
        Cancelar
      </Button>
    </div>
  );
}

/**
 * La barra de acción, pegada abajo mientras haya algo seleccionado: la nota que llevarán
 * todos y el botón. La nota es opcional y es UNA para el lote — el lote existe justo para
 * los pagos que son irrelevantes por la misma razón.
 */
export function BulkIrrelevantBar({ selection }: { selection: Selection }) {
  const { state, actions } = selection;
  if (!state.active || state.selectedCount === 0) return null;

  const count = state.selectedCount;

  return (
    <div className="sticky bottom-3 z-10 space-y-3 rounded-xl border border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg sm:flex sm:items-center sm:gap-3 sm:space-y-0">
      <div className="flex items-baseline justify-between gap-3 sm:block sm:shrink-0">
        <p className="text-sm font-bold tabular-nums text-foreground">
          {count} {count === 1 ? 'seleccionado' : 'seleccionados'}
        </p>
        <button
          type="button"
          className="text-xs font-medium text-primary hover:underline"
          onClick={actions.toggleAll}
        >
          {state.allSelected ? 'Quitar selección' : `Seleccionar los ${state.selectableCount} cargados`}
        </button>
      </div>
      <Input
        value={state.description}
        onChange={(e) => actions.setDescription(e.target.value)}
        placeholder="Motivo (opcional): captura repetida, no es un pago…"
        aria-label="Motivo para todos los seleccionados"
        className="h-11 min-w-0 flex-1 sm:h-9"
      />
      <Button
        className="h-11 w-full shrink-0 sm:h-9 sm:w-auto"
        onClick={actions.markIrrelevant}
        disabled={state.working}
      >
        <Tag className="h-4 w-4" />
        {state.working
          ? 'Marcando…'
          : `Marcar ${count} como ${count === 1 ? 'irrelevante' : 'irrelevantes'}`}
      </Button>
    </div>
  );
}
