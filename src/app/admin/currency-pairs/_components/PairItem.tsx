'use client';

import { Bitcoin, Layers, Link2, Shuffle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import type { CurrencyPairData, PairType } from '@/types/admin';
import { PairStatusToggles } from './PairStatusToggles';
import { PairActions } from './PairActions';

type PairTypeMeta = {
  label: string;
  tone: 'success' | 'info' | 'primary' | 'neutral';
  icon: LucideIcon;
};

function getPairTypeMeta(pairType: PairType): PairTypeMeta {
  const normalized = (pairType as string).toUpperCase();
  switch (normalized) {
    case 'BASE':
      return { label: 'Base', tone: 'success', icon: Layers };
    case 'DERIVED':
      return { label: 'Derivado', tone: 'info', icon: Link2 };
    case 'CROSS':
      return { label: 'Cruzado', tone: 'primary', icon: Shuffle };
    default:
      return { label: 'Desconocido', tone: 'neutral', icon: Layers };
  }
}

interface PairItemProps {
  pair: CurrencyPairData;
  onEdit: (pair: CurrencyPairData) => void;
  onDelete: (uuid: string) => void;
  onShowHistory: (pair: CurrencyPairData) => void;
  onManualRate: (pair: CurrencyPairData) => void;
  onToggleActive: (pair: CurrencyPairData) => void;
  onToggleMonitored: (pair: CurrencyPairData) => void;
  onToggleBinance: (pair: CurrencyPairData) => void;
}

export function PairItem({
  pair,
  onEdit,
  onDelete,
  onShowHistory,
  onManualRate,
  onToggleActive,
  onToggleMonitored,
  onToggleBinance,
}: PairItemProps) {
  const typeMeta = getPairTypeMeta(pair.pair_type);

  return (
    <Card className={cn('overflow-hidden transition-shadow hover:shadow-md')}>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <header className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div
              aria-hidden
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/80 to-primary text-primary-foreground"
            >
              <span className="text-sm font-bold">
                {pair.from_currency.symbol.charAt(0)}
                {pair.to_currency.symbol.charAt(0)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-semibold text-foreground sm:text-lg">
                  {pair.display_name}
                </h3>
                <StatusBadge tone={typeMeta.tone} icon={typeMeta.icon}>
                  {typeMeta.label}
                </StatusBadge>
                {pair.usdt_reference_side ? (
                  <StatusBadge tone="primary">USDT</StatusBadge>
                ) : null}
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                <span className="font-medium text-foreground/80">{pair.from_currency.name}</span>
                <span className="mx-2 text-muted-foreground/70">→</span>
                <span className="font-medium text-foreground/80">{pair.to_currency.name}</span>
              </p>
            </div>
          </div>
          <PairActions
            pair={pair}
            onEdit={onEdit}
            onDelete={onDelete}
            onShowHistory={onShowHistory}
            onManualRate={onManualRate}
          />
        </header>

        {pair.description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{pair.description}</p>
        ) : null}

        {(pair.base_pair || pair.derived_percentage) && (
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {pair.base_pair && (
              <p>
                <span className="font-semibold text-foreground/80">Par base:</span>{' '}
                {pair.base_pair.display_name}
              </p>
            )}
            {pair.derived_percentage != null && (
              <p>
                <span className="font-semibold text-foreground/80">Porcentaje:</span>{' '}
                {pair.derived_percentage}%{' '}
                {pair.use_inverse_percentage ? '(inverso)' : ''}
              </p>
            )}
          </div>
        )}

        {pair.binance_tracked && pair.banks_to_track && pair.amount_to_track && (
          <div className="flex flex-col gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Bitcoin className="h-4 w-4" /> Configuración Binance P2P
            </div>
            <p>
              <span className="font-semibold">Métodos:</span> {pair.banks_to_track.join(', ')}
            </p>
            <p>
              <span className="font-semibold">Monto:</span> ${pair.amount_to_track}
            </p>
          </div>
        )}

        <PairStatusToggles
          pair={pair}
          onToggleActive={onToggleActive}
          onToggleMonitored={onToggleMonitored}
          onToggleBinance={onToggleBinance}
        />
      </CardContent>
    </Card>
  );
}
