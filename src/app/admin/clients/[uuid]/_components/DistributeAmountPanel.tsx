'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { formatAmountForInput, sanitizeAmountInput } from '@/utils/functions';
import { blockedReason, type useClientPending } from '../_hooks/useClientPending';
import { formatPending, formatPendingBreakdown, pendingSince, waitedFor } from '../../_lib/pending';

type PendingHook = ReturnType<typeof useClientPending>;

interface DistributeAmountPanelProps {
  state: PendingHook['state'];
  actions: PendingHook['actions'];
}

/**
 * Repartir un monto entregado, de la más vieja a la más nueva.
 *
 * Todo lo que se ve aquí es un previo: se calcula entero antes de tocar nada y no se
 * guarda hasta confirmar. Cada fila del previo se puede desmarcar, y el monto se
 * re-reparte entre las que quedan.
 */
export function DistributeAmountPanel({ state, actions }: DistributeAmountPanelProps) {
  const { preview, totals } = state;
  const byUuid = new Map(state.rows.map((operation) => [operation.uuid, operation]));

  // Un monto entregado está en una sola moneda. Si el cliente debe en varias, repartirlo
  // sería restar bolívares de una deuda en dólares: primero hay que elegir un par.
  if (state.distributeCurrency == null) {
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

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="distribute-amount" className="text-xs uppercase tracking-wide text-muted-foreground">
                Monto entregado
              </Label>
              <Input
                id="distribute-amount"
                inputMode="decimal"
                autoComplete="off"
                value={state.amount}
                onChange={(event) => {
                  const next = sanitizeAmountInput(event.target.value);
                  if (next !== null) actions.setAmount(next);
                }}
                placeholder="0,00"
                className="h-12 text-lg font-bold tabular-nums"
              />
            </div>
            <Button
              variant="outline"
              size="lg"
              className="shrink-0"
              onClick={() => actions.setAmount(formatAmountForInput(totals.amount))}
            >
              Todo: {formatPending(totals.amount, totals.currency)}
            </Button>
          </div>

          <div className="flex items-start gap-3">
            <Switch
              id="allow-partial"
              checked={state.allowPartial}
              onCheckedChange={actions.setAllowPartial}
            />
            <Label htmlFor="allow-partial" className="text-sm font-normal text-foreground">
              Permitir cubrir una parcialmente
              <span className="block text-xs text-muted-foreground">
                Si lo apagas, sólo se cubren operaciones completas y el resto queda como sobrante.
              </span>
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Así quedaría
        </p>

        {preview.rows.map((row) => {
          const operation = byUuid.get(row.uuid);
          if (!operation) return null;
          const waited = waitedFor(pendingSince(operation, state.paymentDates));
          const name = operation.beneficiary_alias || 'Sin beneficiario';
          const blocked = blockedReason(operation);
          const excluded = state.excluded.has(row.uuid);

          return (
            <button
              key={row.uuid}
              type="button"
              aria-pressed={!excluded && !blocked}
              disabled={!!blocked}
              onClick={() => actions.toggleExcluded(row.uuid)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                row.kind === 'full' && 'border-emerald-500/30 bg-emerald-500/10',
                row.kind === 'partial' && 'border-amber-500/30 bg-amber-500/10',
                row.kind === 'none' && 'border-dashed border-border opacity-70',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                  row.kind === 'full' && 'bg-emerald-600 text-white',
                  row.kind === 'partial' && 'bg-amber-500 text-amber-950',
                  row.kind === 'none' && 'border border-dashed border-muted-foreground/40',
                )}
                aria-hidden
              >
                {row.kind === 'full' ? <Check className="h-3.5 w-3.5" strokeWidth={3.5} /> : null}
                {row.kind === 'partial' ? '½' : null}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  <span className="font-mono text-xs text-muted-foreground">
                    {row.uuid.slice(0, 8)}
                  </span>{' '}
                  · {name}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {blocked ? (
                    `${blocked} · no entra en el reparto`
                  ) : excluded ? (
                    'Desmarcada · no entra en el reparto'
                  ) : row.kind === 'full' ? (
                    <>{waited ? `${waited} esperando · ` : ''}queda entregada completa</>
                  ) : row.kind === 'partial' ? (
                    <>
                      Parcial · le quedarían{' '}
                      {formatPending(row.remaining, totals.currency)} por entregar
                    </>
                  ) : (
                    'No alcanza · sigue pendiente'
                  )}
                </span>
              </span>

              <span
                className={cn(
                  'shrink-0 text-sm font-bold tabular-nums',
                  row.kind === 'full' && 'text-emerald-700 dark:text-emerald-400',
                  row.kind === 'partial' && 'text-amber-700 dark:text-amber-400',
                  row.kind === 'none' && 'text-muted-foreground',
                )}
              >
                {formatPending(row.kind === 'none' ? row.remaining : row.applied, null)}
              </span>
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-muted-foreground">Se aplica</span>
            <span className="text-sm font-bold tabular-nums text-foreground">
              {formatPending(preview.applied, totals.currency)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-muted-foreground">Sobrante sin asignar</span>
            <span className="text-sm font-semibold tabular-nums text-muted-foreground">
              {formatPending(preview.leftover, totals.currency)}
            </span>
          </div>
          <div className="border-t border-border pt-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold text-foreground">Le seguirías debiendo</span>
              <span className="text-base font-bold tabular-nums text-destructive">
                {formatPending(preview.outstanding, totals.currency)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="outline"
          size="lg"
          className="sm:w-auto"
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
          disabled={preview.touched === 0 || state.working}
          onClick={actions.applyDistribution}
        >
          {state.working
            ? 'Aplicando…'
            : `Aplicar reparto · ${preview.touched} ${preview.touched === 1 ? 'operación' : 'operaciones'}`}
        </Button>
      </div>

      {preview.leftover > 0 ? (
        <p className="text-xs text-muted-foreground">
          Sobran {formatPending(preview.leftover, totals.currency)} sin asignar. Si quieres
          dejárselos como saldo a favor, se hace desde la pestaña Cuenta; el reparto no lo hace
          solo.
        </p>
      ) : null}
    </div>
  );
}
