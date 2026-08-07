'use client';

import { AlertTriangle, Bitcoin, Clock, Link2, Pencil, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PairType, type CurrencyPairData } from '@/types/admin';
import {
  derivedPercentageLabel,
  formatAge,
  formatPercentage,
  formatRate,
  getPairHealth,
  normalizePairType,
  PAIR_TYPE_LABEL,
  rateOrigin,
} from '../_lib/pairHealth';
import { PairActions } from './PairActions';

/** Mismo track en la cabecera y en cada fila para que las columnas cuadren. */
export const PAIR_GRID =
  'grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 lg:grid-cols-[minmax(0,1fr)_10rem_5rem_10rem_3.5rem] lg:gap-y-0';

const TYPE_CHIP: Record<PairType, string> = {
  [PairType.BASE]: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  [PairType.DERIVED]: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  [PairType.CROSS]: 'bg-primary/10 text-primary',
};

interface PairRowProps {
  pair: CurrencyPairData;
  onEdit: (pair: CurrencyPairData) => void;
  onDelete: (uuid: string) => void;
  onShowHistory: (pair: CurrencyPairData) => void;
  onManualRate: (pair: CurrencyPairData) => void;
}

function OriginIcon({ kind }: { kind: ReturnType<typeof rateOrigin>['kind'] }) {
  const className = 'h-3.5 w-3.5 shrink-0';
  switch (kind) {
    case 'binance':
      return <Bitcoin className={cn(className, 'text-amber-600 dark:text-amber-500')} />;
    case 'derived':
      return <Link2 className={cn(className, 'text-sky-600 dark:text-sky-400')} />;
    case 'cross':
      return <Shuffle className={cn(className, 'text-primary')} />;
    case 'manual':
      return <Pencil className={cn(className, 'text-amber-600 dark:text-amber-500')} />;
    default:
      return <AlertTriangle className={cn(className, 'text-destructive')} />;
  }
}

export function PairRow({ pair, onEdit, onDelete, onShowHistory, onManualRate }: PairRowProps) {
  const health = getPairHealth(pair);
  const type = normalizePairType(pair.pair_type);
  const origin = rateOrigin(pair);
  const percentage = derivedPercentageLabel(pair);
  const rate = pair.current_rate;
  const isManual = rate?.is_manual === true;
  const change = rate?.change_24h_percentage;

  return (
    <div
      className={cn(
        PAIR_GRID,
        'items-center border-t border-border px-3 py-3 first:border-t-0 lg:min-h-[3.75rem] lg:py-2',
        // Una barra al borde izquierdo es toda la señal que hace falta: la fila
        // normal no lleva color, para que lo que sí falla resalte solo.
        health === 'stale' && 'shadow-[inset_3px_0_0_var(--color-amber-500)]',
        health === 'missing' && 'shadow-[inset_3px_0_0_var(--color-destructive)]',
        health === 'off' && 'opacity-55'
      )}
    >
      {/* Par */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(pair)}
            className="truncate font-mono text-sm font-bold text-foreground hover:underline"
          >
            {pair.display_name}
          </button>
          <span
            className={cn('rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold', TYPE_CHIP[type])}
          >
            {PAIR_TYPE_LABEL[type]}
          </span>
          {percentage ? (
            <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold whitespace-nowrap text-muted-foreground">
              {percentage}
            </span>
          ) : null}
          {!pair.is_active ? (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold text-muted-foreground">
              Inactivo
            </span>
          ) : null}
        </div>
        <p
          className={cn(
            'mt-0.5 truncate text-xs',
            health === 'missing' ? 'font-medium text-destructive' : 'text-muted-foreground'
          )}
        >
          {health === 'missing'
            ? 'Nunca cotizó: revisa el origen de la tasa'
            : pair.description || `${pair.from_currency.name} → ${pair.to_currency.name}`}
        </p>
      </div>

      {/* Acciones — en móvil sube junto al nombre; en escritorio va al final */}
      <div className="row-start-1 flex justify-end lg:order-last lg:col-start-5">
        <PairActions
          pair={pair}
          health={health}
          onEdit={onEdit}
          onDelete={onDelete}
          onShowHistory={onShowHistory}
        />
      </div>

      {/* Tasa vigente + lápiz de precio manual */}
      <div className="col-span-2 flex items-center gap-2 lg:col-span-1 lg:col-start-2">
        <div className="min-w-0 flex-1 lg:flex-none">
          {rate ? (
            <p className="text-sm font-bold text-foreground tabular-nums">{formatRate(rate.rate)}</p>
          ) : (
            <p className="text-sm font-bold text-destructive">Sin tasa</p>
          )}
          {rate ? (
            <p
              className={cn(
                'flex items-center gap-1 text-xs',
                health === 'stale'
                  ? 'font-medium text-amber-700 dark:text-amber-400'
                  : isManual
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-muted-foreground'
              )}
            >
              {health === 'stale' ? <Clock className="h-3 w-3 shrink-0" aria-hidden /> : null}
              {isManual ? 'manual · ' : `${pair.to_currency.symbol} · `}
              {formatAge(rate.read_at)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">nunca cotizó</p>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          aria-label={
            isManual
              ? `Editar precio manual de ${pair.display_name}`
              : `Fijar precio manual de ${pair.display_name}`
          }
          onClick={() => onManualRate(pair)}
          className={cn(
            'min-h-11 min-w-11 shrink-0 lg:min-h-9 lg:min-w-9',
            isManual && 'bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-400'
          )}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Variación 24 h */}
      <div className="lg:col-start-3">
        <span className="text-xs text-muted-foreground lg:hidden">24 h: </span>
        <span
          className={cn(
            'text-xs font-semibold tabular-nums',
            change == null
              ? 'font-normal text-muted-foreground'
              : change > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : change < 0
                  ? 'text-destructive'
                  : 'text-muted-foreground'
          )}
        >
          {isManual && change == null ? 'fijo' : change == null ? '—' : formatPercentage(change)}
        </span>
      </div>

      {/* Origen de la tasa */}
      <div className="flex min-w-0 items-center justify-end gap-1.5 lg:col-start-4 lg:justify-start">
        <OriginIcon kind={origin.kind} />
        <span
          className={cn(
            'truncate text-xs',
            origin.kind === 'none'
              ? 'font-medium text-destructive'
              : origin.kind === 'manual'
                ? 'font-medium text-amber-700 dark:text-amber-400'
                : 'text-muted-foreground'
          )}
          title={origin.label}
        >
          {origin.label}
        </span>
      </div>
    </div>
  );
}
