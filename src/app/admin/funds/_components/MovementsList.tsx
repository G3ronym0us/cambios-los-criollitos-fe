'use client';

import { ChevronLeft, ChevronRight, Receipt, Undo2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import type { FundMovement } from '@/types/fund';
import { formatPercentage, formatUSDT } from '../_lib/format';
import { MOVEMENT_META } from './movementMeta';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

/** Ventana de páginas alrededor de la actual (máx. 5 números visibles). */
function pageWindow(page: number, totalPages: number): number[] {
  const span = 5;
  let start = Math.max(1, page - Math.floor(span / 2));
  const end = Math.min(totalPages, start + span - 1);
  start = Math.max(1, end - span + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

interface MovementsListProps {
  movements: FundMovement[];
  loading: boolean;
  isRoot: boolean;
  page: number;
  totalPages: number;
  total: number;
  getUserDisplayName: (uuid: string, fallback?: string | null) => string;
  onReverse: (movement: FundMovement) => void;
  onPageChange: (page: number) => void;
}

export function MovementsList({
  movements,
  loading,
  isRoot,
  page,
  totalPages,
  total,
  getUserDisplayName,
  onReverse,
  onPageChange,
}: MovementsListProps) {
  if (loading && movements.length === 0) {
    return (
      <Card className="overflow-hidden">
        <ul className="divide-y divide-border">
          {[1, 2, 3, 4].map((i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
              <div className="h-5 w-16 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-3.5 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  if (movements.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No hay movimientos"
        description="No se ha registrado ningún movimiento con estos filtros."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <ul className="divide-y divide-border">
          {movements.map((mv) => {
            const meta = MOVEMENT_META[mv.movement_type];
            const userName = getUserDisplayName(mv.user_uuid, mv.username);
            const showOriginal =
              mv.currency && mv.currency !== 'USDT' && mv.currency !== 'USD';
            return (
              <li
                key={mv.uuid}
                className={cn(
                  'flex items-center gap-3 px-4 py-3.5 sm:px-5',
                  mv.is_reversed && 'bg-muted/40',
                )}
              >
                <StatusBadge tone={meta.tone} icon={meta.icon} className="shrink-0">
                  {meta.label}
                </StatusBadge>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm text-foreground">
                    <span className="truncate">{userName}</span>
                    {mv.client_name ? (
                      <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="truncate">{mv.client_name}</span>
                      </span>
                    ) : null}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                    <span>{formatDate(mv.movement_date)}</span>
                    {mv.is_reversal ? (
                      <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                        <Undo2 className="h-3 w-3" />
                        anula un movimiento
                      </span>
                    ) : null}
                    {mv.is_reversed ? (
                      <span className="font-medium text-muted-foreground">· reversado</span>
                    ) : null}
                  </p>
                  {(mv.is_reversal || mv.is_reversed) && mv.notes ? (
                    <p className="truncate text-xs italic text-muted-foreground">{mv.notes}</p>
                  ) : null}
                </div>

                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      'font-mono text-sm font-semibold tabular-nums',
                      mv.is_reversed
                        ? 'text-muted-foreground line-through'
                        : mv.is_reversal
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-foreground',
                    )}
                  >
                    {mv.is_reversal ? '−' : ''}
                    {formatUSDT(mv.amount_usdt)} USDT
                  </p>
                  {showOriginal ? (
                    <p className="font-mono text-xs text-muted-foreground">
                      {formatUSDT(mv.amount)} {mv.currency}
                    </p>
                  ) : null}
                  {/* Lo que dejó el movimiento, no lo que movió: solo los que vienen de una
                      operación con transacción tienen ganancia. */}
                  {mv.profit_amount_usdt != null ? (
                    <p className="font-mono text-xs tabular-nums text-emerald-600 dark:text-emerald-400">
                      +{formatUSDT(mv.profit_amount_usdt)} USDT
                      {mv.profit_percentage != null ? (
                        <span className="text-muted-foreground">
                          {' '}
                          · {formatPercentage(mv.profit_percentage)}
                        </span>
                      ) : null}
                    </p>
                  ) : null}

                  {/* Cómo quedaba el fondo justo después de este movimiento (extracto). */}
                  {mv.running_balance_usdt != null ? (
                    <p className="mt-0.5 border-t border-border/60 pt-0.5 font-mono text-[11px] leading-tight tabular-nums text-muted-foreground">
                      saldo{' '}
                      <span
                        className={cn(
                          'font-medium',
                          mv.running_balance_usdt < 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-foreground',
                        )}
                      >
                        {formatUSDT(mv.running_balance_usdt)}
                      </span>
                      {mv.running_profit_usdt != null ? (
                        <> · ganado {formatUSDT(mv.running_profit_usdt)}</>
                      ) : null}
                    </p>
                  ) : null}
                </div>

                {isRoot && !mv.is_reversal && !mv.is_reversed && !mv.transaction_uuid ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onReverse(mv)}
                    aria-label="Reversar movimiento"
                    className="shrink-0 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600"
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>

      {totalPages > 1 ? (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages} · {total} {total === 1 ? 'movimiento' : 'movimientos'}
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <div className="flex items-center gap-1">
              {pageWindow(page, totalPages).map((p) => (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'outline'}
                  size="icon-sm"
                  className={cn('h-9 w-9', p === page && 'pointer-events-none')}
                  aria-current={p === page ? 'page' : undefined}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
