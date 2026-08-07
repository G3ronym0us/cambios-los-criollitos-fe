'use client';

import { AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CurrencyPairData } from '@/types/admin';
import {
  derivedPercentageLabel,
  formatAge,
  formatPercentage,
  formatRate,
  getPairHealth,
  normalizePairType,
  PAIR_TYPE_LABEL,
} from '../../_lib/pairHealth';

/**
 * Cabecera del detalle: la tasa vigente, su antigüedad y su variación. Es el
 * dato por el que se entra a esta pantalla, así que va antes que el formulario.
 */
export function PairRateHeader({ pair }: { pair: CurrencyPairData }) {
  const rate = pair.current_rate;
  const health = getPairHealth(pair);
  const type = normalizePairType(pair.pair_type);
  const percentage = derivedPercentageLabel(pair);
  const change = rate?.change_24h_percentage;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-border bg-card px-4 py-3">
      <div>
        <p className="text-[0.65rem] font-bold tracking-wider text-muted-foreground uppercase">
          Tasa vigente
        </p>
        {rate ? (
          <p className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-foreground tabular-nums">
              {formatRate(rate.rate)}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {pair.to_currency.symbol}
            </span>
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-xl font-bold text-destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            Sin tasa
          </p>
        )}
      </div>

      <span className="hidden h-8 w-px bg-border sm:block" aria-hidden />

      <div className="text-xs leading-relaxed">
        {rate ? (
          <>
            <span
              className={cn(
                'flex items-center gap-1',
                health === 'stale'
                  ? 'font-medium text-amber-700 dark:text-amber-400'
                  : 'text-muted-foreground'
              )}
            >
              {health === 'stale' ? <Clock className="h-3 w-3" aria-hidden /> : null}
              {rate.is_manual ? 'Precio manual · fijado' : 'Leída'} {formatAge(rate.read_at)}
            </span>
            {change != null ? (
              <span
                className={cn(
                  'font-semibold',
                  change > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : change < 0
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                )}
              >
                {formatPercentage(change)} en 24 h
              </span>
            ) : (
              <span className="text-muted-foreground">sin referencia de 24 h</span>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">
            Este par nunca cotizó: revisa su origen de tasa.
          </span>
        )}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {PAIR_TYPE_LABEL[type]}
        </span>
        {percentage ? (
          <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-xs font-semibold text-muted-foreground">
            {percentage}
          </span>
        ) : null}
        {!pair.is_active ? (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            Inactivo
          </span>
        ) : null}
      </div>
    </div>
  );
}
