'use client';

import { useEffect, useRef } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Receipt, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import type { FundMovement } from '@/types/fund';
import { formatPercentage, formatUSDT } from '../_lib/format';
import { movementMeta } from './movementMeta';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
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

/**
 * Rejilla del extracto, con las mismas celdas colocadas distinto en cada tamaño.
 *
 * En móvil se apila como una ficha —tipo y monto arriba, luego quién, luego fecha y ganancia,
 * y los acumulados abajo tras una línea— y desde `md` las celdas se reparten en las cuatro
 * columnas de la cabecera. Una sola estructura: la fila de acumulados se disuelve con
 * `md:contents` para que sus dos números pasen a ser columnas.
 */
const ROW_GRID =
  'grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 md:grid-cols-[auto_minmax(0,1fr)_130px_120px_110px] md:gap-y-0';

/** Cabecera: la columna del tipo no lleva título, va pegada a «Movimiento». */
const HEADER_GRID =
  'grid grid-cols-[minmax(0,1fr)_130px_120px_110px] gap-x-4';

interface MovementsListProps {
  movements: FundMovement[];
  loading: boolean;
  isRoot: boolean;
  page: number;
  totalPages: number;
  total: number;
  getUserDisplayName: (uuid: string, fallback?: string | null) => string;
  /** Movimiento al que se acaba de saltar: se resalta hasta que el operador lo ve. */
  focusUuid?: string | null;
  onReverse: (movement: FundMovement) => void;
  onGoToMovement: (uuid: string) => void;
  onClearFocus: () => void;
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
  focusUuid,
  onReverse,
  onGoToMovement,
  onClearFocus,
  onPageChange,
}: MovementsListProps) {
  const focusedRow = useRef<HTMLLIElement | null>(null);

  // Al llegar desde el otro lado de una anulación, traer la fila a la vista y soltar la marca.
  useEffect(() => {
    if (!focusUuid || !focusedRow.current) return;
    focusedRow.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = setTimeout(onClearFocus, 2600);
    return () => clearTimeout(timer);
  }, [focusUuid, onClearFocus]);
  if (loading && movements.length === 0) {
    return (
      <Card className="overflow-hidden">
        <ul className="divide-y divide-border">
          {[1, 2, 3, 4].map((i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3.5 sm:px-[18px]">
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
      <Card className="gap-0 overflow-hidden py-0">
        {/* Cabecera del extracto: solo donde las columnas se alinean de verdad. */}
        <div
          className={cn(
            HEADER_GRID,
            'hidden border-b border-border bg-muted/40 px-[18px] py-2.5 md:grid',
          )}
        >
          {['Movimiento', 'Monto', 'Saldo', 'Ganado acum.'].map((label, i) => (
            <span
              key={label}
              className={cn(
                'text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground',
                i > 0 && 'text-right',
              )}
            >
              {label}
            </span>
          ))}
        </div>

        <ul className="divide-y divide-border">
          {movements.map((mv) => {
            const meta = movementMeta(mv.movement_type);
            const userName = getUserDisplayName(mv.user_uuid, mv.username);
            const canReverse =
              isRoot && !mv.is_reversal && !mv.is_reversed && !mv.transaction_uuid;
            // El otro lado de la anulación: la corrección si está anulado, el original si es la reversa.
            const counterpartUuid =
              mv.reversed_by_movement_uuid ?? mv.reverses_movement_uuid ?? null;
            return (
              <li
                key={mv.uuid}
                ref={mv.uuid === focusUuid ? focusedRow : undefined}
                className={cn(
                  ROW_GRID,
                  'scroll-mt-24 px-4 py-3 transition-colors duration-500 sm:px-[18px]',
                  mv.is_reversed && 'bg-muted/30',
                  mv.uuid === focusUuid && 'bg-primary/10 ring-1 ring-inset ring-primary/40',
                )}
              >
                {/* tipo — en móvil abre la ficha; en tabla es la primera columna */}
                <StatusBadge
                  tone={meta.tone}
                  className="col-start-1 row-start-1 shrink-0 justify-self-start md:row-span-3 md:self-center"
                >
                  {meta.label}
                </StatusBadge>

                {/* monto */}
                <p
                  className={cn(
                    'col-start-2 row-start-1 justify-self-end font-mono text-[13.5px] font-bold tabular-nums md:col-start-3 md:row-start-1',
                    mv.is_reversed
                      ? 'text-muted-foreground line-through'
                      : mv.is_reversal
                        ? 'text-primary'
                        : 'text-foreground',
                  )}
                >
                  {mv.is_reversal ? '−' : ''}
                  {formatUSDT(mv.amount_usdt)} USDT
                </p>

                {/* quién, y con quién */}
                <p className="col-span-2 row-start-2 truncate text-sm text-foreground md:col-span-1 md:col-start-2 md:row-start-1">
                  {userName}
                  {mv.client_name ? (
                    <span className="font-normal text-muted-foreground">
                      {' → '}
                      {mv.client_name}
                    </span>
                  ) : null}
                </p>

                {/* cuándo */}
                <p className="col-start-1 row-start-3 truncate text-[11.5px] text-muted-foreground md:col-start-2 md:row-start-2">
                  {formatDate(mv.movement_date)}
                </p>

                {/* la ganancia que dejó: junto a la fecha en móvil, bajo el monto en tabla */}
                {mv.profit_amount_usdt != null && !mv.is_reversed ? (
                  <p className="col-start-2 row-start-3 justify-self-end whitespace-nowrap text-[11px] font-semibold tabular-nums text-emerald-600 md:col-start-3 md:row-start-2 dark:text-emerald-400">
                    +{formatUSDT(mv.profit_amount_usdt)} USDT
                    {mv.profit_percentage != null
                      ? ` · ${formatPercentage(mv.profit_percentage)}`
                      : ''}
                  </p>
                ) : null}

                {/* el motivo de la anulación */}
                {counterpartUuid ? (
                  <button
                    type="button"
                    onClick={() => onGoToMovement(counterpartUuid)}
                    title={
                      mv.is_reversed ? 'Ver la corrección' : 'Ver el movimiento que anula'
                    }
                    className="col-span-2 row-start-4 flex min-w-0 items-center gap-1 text-left text-[11px] text-primary hover:underline md:col-span-1 md:col-start-2 md:row-start-3"
                  >
                    <Undo2 className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">
                      {mv.is_reversed ? `Anulado: ${mv.notes ?? 'sin motivo'}` : mv.notes}
                    </span>
                    <ArrowUpRight className="h-2.5 w-2.5 shrink-0" />
                  </button>
                ) : null}

                {/* acumulados: una línea aparte en móvil, dos columnas en tabla */}
                <div className="col-span-2 row-start-5 flex items-center justify-between gap-4 border-t border-border/60 pt-1.5 text-[10.5px] text-muted-foreground md:contents">
                  <span className="md:col-start-4 md:row-span-3 md:row-start-1 md:self-center md:text-right md:text-[12.5px]">
                    <span className="md:hidden">Saldo </span>
                    <span className="font-mono font-medium tabular-nums text-muted-foreground">
                      {mv.running_balance_usdt != null
                        ? formatUSDT(mv.running_balance_usdt)
                        : '—'}
                    </span>
                  </span>
                  <span className="md:col-start-5 md:row-span-3 md:row-start-1 md:self-center md:text-right md:text-[12.5px]">
                    <span className="md:hidden">Ganado </span>
                    <span className="font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {mv.running_profit_usdt != null ? formatUSDT(mv.running_profit_usdt) : '—'}
                    </span>
                  </span>
                </div>

                {canReverse ? (
                  <div className="col-span-2 flex justify-end md:col-span-5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onReverse(mv)}
                      className="h-7 gap-1.5 px-2 text-[11px] text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    >
                      <Undo2 className="h-3 w-3" />
                      Reversar
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>

      {totalPages > 1 ? (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-[12.5px] text-muted-foreground">
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
