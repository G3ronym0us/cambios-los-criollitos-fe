'use client';

import { ChevronLeft, ChevronRight, FileText, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { OperationData } from '@/types/operation';
import { PAGE_SIZES } from '../_hooks/useOperations';
import { OperationRow, OPERATION_GRID } from './OperationRow';

interface OperationsListProps {
  operations: OperationData[];
  loading: boolean;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  from: number;
  to: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

/**
 * Los números de página a dibujar, con elipsis cuando no caben todos.
 * Siempre se ven la primera, la última y las vecinas de la actual.
 */
function pageItems(page: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const items: (number | 'gap')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) items.push('gap');
  for (let i = start; i <= end; i += 1) items.push(i);
  if (end < totalPages - 1) items.push('gap');
  items.push(totalPages);
  return items;
}

export function OperationsList({
  operations,
  loading,
  hasActiveFilters,
  onResetFilters,
  page,
  pageSize,
  total,
  totalPages,
  from,
  to,
  onPageChange,
  onPageSizeChange,
}: OperationsListProps) {
  if (loading) return <LoadingState label="Cargando operaciones..." />;

  if (operations.length === 0) {
    return (
      <EmptyState
        icon={hasActiveFilters ? SlidersHorizontal : FileText}
        title={hasActiveFilters ? 'No hay operaciones con estos filtros' : 'Aún no hay operaciones'}
        description={
          hasActiveFilters
            ? 'Prueba ajustando los filtros de búsqueda.'
            : 'Las operaciones se crean cuando un cliente cotiza con el bot de WhatsApp.'
        }
        actions={
          hasActiveFilters ? (
            <Button variant="outline" size="lg" onClick={onResetFilters}>
              <RotateCcw className="h-4 w-4" />
              Limpiar filtros
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* La cabecera solo tiene sentido con las columnas desplegadas. */}
        <div
          className={cn(
            OPERATION_GRID,
            'hidden border-b border-border bg-muted/50 px-3 py-2 text-[0.65rem] font-bold tracking-wider text-muted-foreground uppercase lg:grid',
          )}
        >
          <span>Cliente</span>
          <span>Cambio</span>
          <span>Tasa</span>
          <span>Cobertura</span>
          <span>Estado</span>
          <span>Fecha</span>
        </div>

        {operations.map((op) => (
          <OperationRow key={op.uuid} operation={op} />
        ))}
      </div>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-xs text-muted-foreground">
          Mostrando <span className="font-semibold text-foreground tabular-nums">{from}–{to}</span>{' '}
          de <span className="font-semibold text-foreground tabular-nums">{total}</span>
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v) || PAGE_SIZES[0])}
          >
            <SelectTrigger className="h-9 w-auto min-w-[8.5rem]" aria-label="Operaciones por página">
              <SelectValue>{(v) => `${v} por página`}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} por página
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
              aria-label="Página anterior"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {pageItems(page, totalPages).map((item, i) =>
              item === 'gap' ? (
                <span key={`gap-${i}`} className="px-1 text-xs text-muted-foreground">
                  …
                </span>
              ) : (
                <Button
                  key={item}
                  variant={item === page ? 'default' : 'outline'}
                  size="icon"
                  aria-label={`Página ${item}`}
                  aria-current={item === page ? 'page' : undefined}
                  className="min-h-11 min-w-11 tabular-nums sm:min-h-9 sm:min-w-9"
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </Button>
              ),
            )}

            <Button
              variant="outline"
              size="icon"
              className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9"
              aria-label="Página siguiente"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
