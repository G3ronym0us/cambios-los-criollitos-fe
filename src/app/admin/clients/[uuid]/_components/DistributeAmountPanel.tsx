'use client';

import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  formatAmountForInput,
  formatCaracasShortDateTime,
  sanitizeAmountInput,
} from '@/utils/functions';
import { type useClientPending } from '../_hooks/useClientPending';
import { formatPending, formatPendingBreakdown, pendingSince } from '../../_lib/pending';

type PendingHook = ReturnType<typeof useClientPending>;

interface DistributeAmountPanelProps {
  state: PendingHook['state'];
  actions: PendingHook['actions'];
}

/**
 * Repartir un monto entregado, en dos pasos.
 *
 * **Paso 1 — cuánto.** Una sola pregunta, sin nada más en pantalla. Antes el monto y el
 * reparto vivían juntos y las filas se recalculaban bajo el ratón mientras se tecleaba: no
 * se sabía si lo que se veía era una propuesta o una decisión.
 *
 * **Paso 2 — entre cuáles.** Con la cifra ya fijada, la lista de lo que se le debe: fecha,
 * cuánto falta, y lo que le toca — editable. El reparto por antigüedad viene sembrado como
 * propuesta, no como regla.
 *
 * **La condición para confirmar: lo colocado tiene que cuadrar con lo escrito, al céntimo.**
 * Dejar parte sin colocar no es repartir menos — es perder de vista dinero que ya está en la
 * caja. Por eso el botón vive apagado hasta que la cuenta da, y arriba se ve siempre cuánto
 * queda por colocar.
 */
export function DistributeAmountPanel({ state, actions }: DistributeAmountPanelProps) {
  const currency = state.distributeCurrency;

  // Un monto entregado está en una sola moneda. Si el cliente debe en varias, repartirlo
  // sería restar bolívares de una deuda en dólares: primero hay que elegir un par.
  if (currency == null) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Elige un par para repartir un monto
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Se le debe {formatPendingBreakdown(state.entries)} en monedas distintas, y un monto
              entregado está en una sola. Elige el par de arriba y el reparto se hace sobre esa
              moneda.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => actions.setMode('select')}>
            Volver a la lista
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Paso 1 · cuánto entregó ────────────────────────────────────────────
  if (state.step === 'amount') {
    const enough = state.target > 0;
    const excess = state.target - state.totals.amount;

    return (
      <div className="space-y-4">
        <PanelHeader
          onBack={() => actions.setMode('select')}
          title="Repartir un monto entregado"
          hint="Escribe cuánto te entregó. En el paso siguiente eliges entre qué operaciones se coloca."
        />

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label
                  htmlFor="distribute-amount"
                  className="text-xs uppercase tracking-wide text-muted-foreground"
                >
                  Monto entregado
                </Label>
                <div className="relative">
                  <Input
                    id="distribute-amount"
                    inputMode="decimal"
                    autoComplete="off"
                    autoFocus
                    value={state.amount}
                    onChange={(event) => {
                      const next = sanitizeAmountInput(event.target.value);
                      if (next !== null) actions.setAmount(next);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && enough) actions.goToSplit();
                    }}
                    placeholder="0,00"
                    className="h-12 pr-16 text-lg font-bold tabular-nums"
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground"
                  >
                    {currency}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="lg"
                className="shrink-0"
                onClick={() => actions.setAmount(formatAmountForInput(state.totals.amount))}
              >
                Todo: {formatPending(state.totals.amount, currency)}
              </Button>
            </div>

            {/* Más de lo que se le debe no se puede colocar entero, y el paso 2 se quedaría
                sin salida: mejor decirlo aquí. */}
            {excess > 0.01 ? (
              <p className="text-xs text-destructive">
                Son {formatPending(excess, currency)} más de lo que se le debe. Ajusta el monto o
                deja el sobrante como saldo a favor desde «Ajustar saldo».
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              actions.setAmount('');
              actions.setMode('select');
            }}
          >
            Cancelar
          </Button>
          <Button
            size="lg"
            className="flex-1"
            disabled={!enough || excess > 0.01}
            onClick={actions.goToSplit}
          >
            Continuar
          </Button>
        </div>
      </div>
    );
  }

  // ── Paso 2 · entre cuáles ──────────────────────────────────────────────
  const short = state.unassigned > 0.01;
  const over = state.unassigned < -0.01;

  return (
    <div className="space-y-4">
      <PanelHeader
        onBack={actions.backToAmount}
        title={`Repartir ${formatPending(state.target, currency)}`}
        hint="Marca las operaciones que cubre y ajusta lo que le toca a cada una. Para confirmar, lo colocado tiene que sumar el monto entero."
      />

      {/* El marcador: lo único que hay que mirar para saber si ya se puede confirmar. */}
      <div
        className={cn(
          'flex flex-wrap items-baseline justify-between gap-2 rounded-lg border px-3 py-2',
          state.balanced
            ? 'border-emerald-500/30 bg-emerald-500/10'
            : 'border-amber-500/30 bg-amber-500/10',
        )}
      >
        <span className="text-sm text-muted-foreground">
          Colocado{' '}
          <strong className="font-bold tabular-nums text-foreground">
            {formatPending(state.assigned, currency)}
          </strong>{' '}
          de {formatPending(state.target, currency)}
        </span>
        <span
          className={cn(
            'text-sm font-semibold tabular-nums',
            state.balanced ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400',
          )}
        >
          {state.balanced
            ? 'Cuadra'
            : short
              ? `Faltan ${formatPending(state.unassigned, currency)} por colocar`
              : `Te pasaste ${formatPending(Math.abs(state.unassigned), currency)}`}
        </span>
      </div>

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          {state.splittable.map((operation) => {
            const text = state.allocations[operation.uuid] ?? '';
            const given = Number(text.replace(',', '.')) || 0;
            const pending = operation.pending_amount ?? 0;
            const checked = given > 0.01;
            const tooMuch = given - pending > 0.01;

            return (
              <div
                key={operation.uuid}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-3 py-2 last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => actions.toggleAllocation(operation.uuid)}
                  aria-label={`Incluir la operación del ${formatCaracasShortDateTime(pendingSince(operation))}`}
                  className="h-4 w-4 shrink-0 accent-[var(--primary)]"
                />

                <div className="min-w-0 flex-1 basis-40">
                  <p className="truncate text-sm text-foreground">
                    {formatCaracasShortDateTime(pendingSince(operation))}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    debe {formatPending(pending, currency)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Label
                    htmlFor={`alloc-${operation.uuid}`}
                    className="text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    Le toca
                  </Label>
                  <Input
                    id={`alloc-${operation.uuid}`}
                    inputMode="decimal"
                    autoComplete="off"
                    value={text}
                    onChange={(event) => {
                      const next = sanitizeAmountInput(event.target.value);
                      if (next !== null) actions.setAllocation(operation.uuid, next);
                    }}
                    placeholder="0,00"
                    className={cn(
                      'h-9 w-28 text-right tabular-nums',
                      tooMuch && 'border-destructive text-destructive',
                    )}
                  />
                </div>

                {tooMuch ? (
                  <p className="basis-full text-xs text-destructive">
                    Esta operación sólo debe {formatPending(pending, currency)}.
                  </p>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Las trabadas no entran en el reparto, pero se siguen debiendo: si desaparecen sin
          decir nada, el operador busca el hueco que falta y no lo encuentra. */}
      {state.distributableRows.length > state.splittable.length ? (
        <p className="text-xs text-muted-foreground">
          {state.distributableRows.length - state.splittable.length} operación(es) quedan fuera
          del reparto porque les falta el beneficiario. Se siguen debiendo.
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" size="lg" onClick={actions.backToAmount}>
          Cambiar el monto
        </Button>
        <Button
          size="lg"
          className="flex-1"
          disabled={!state.balanced || state.working}
          onClick={actions.applyDistribution}
        >
          {state.working
            ? 'Aplicando…'
            : state.balanced
              ? `Aplicar en ${state.splitRows.length} ${state.splitRows.length === 1 ? 'operación' : 'operaciones'}`
              : over
                ? 'Quita lo que sobra para confirmar'
                : `Coloca ${formatPending(state.unassigned, currency)} más para confirmar`}
        </Button>
      </div>
    </div>
  );
}

/** La cabecera de cada paso: por dónde se sale, dónde estás y qué se espera de ti. */
function PanelHeader({
  onBack,
  title,
  hint,
}: {
  onBack: () => void;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Button variant="ghost" size="sm" className="-ml-2 h-8 w-fit" onClick={onBack}>
        <ChevronLeft className="h-4 w-4" />
        Volver
      </Button>
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  );
}
