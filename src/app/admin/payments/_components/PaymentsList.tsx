'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle, Banknote, CheckCircle2, Loader2, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AttentionFilter, PaymentData, PaymentSuggestion } from '@/types/payment';
import { PaymentItem } from './PaymentItem';
import { getPaymentsListState } from './paymentsListState';
import { PaymentRow, PaymentRowHeader, ROW_GRID } from './PaymentRow';

interface PaymentsListProps {
  payments: PaymentData[];
  outgoing: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  attention: AttentionFilter;
  suggestions: Record<number, PaymentSuggestion>;
  onManage?: (payment: PaymentData) => void;
  // Fila a la que volver (retorno desde "Ver operación"): scroll + resaltado.
  focusId?: number | null;
  onFocusHandled?: () => void;
}

function TableSkeleton() {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-border bg-card lg:block">
      <PaymentRowHeader />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={cn(ROW_GRID, 'h-14 border-t border-border/60 first:border-t-0')}>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-2 w-10" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-2 w-52" />
          </div>
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-7 w-16 justify-self-end rounded-md" />
        </div>
      ))}
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="space-y-2.5 lg:hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2.5 rounded-xl border border-border bg-card p-3">
          <div className="flex justify-between gap-3">
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-2.5 w-32" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-2.5 w-12" />
            </div>
          </div>
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function PaymentsList({
  payments,
  outgoing,
  loading,
  loadingMore,
  error,
  hasMore,
  onLoadMore,
  onRetry,
  hasActiveFilters,
  onResetFilters,
  attention,
  suggestions,
  onManage,
  focusId,
  onFocusHandled,
}: PaymentsListProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Retorno desde el detalle de operación: centra la fila y la resalta un momento.
  useEffect(() => {
    if (focusId == null) return;
    const el = document.getElementById(`payment-row-${outgoing ? 'outgoing' : 'incoming'}-${focusId}`);
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
    el.classList.add('ring-2', 'ring-primary/60');
    const t = setTimeout(() => el.classList.remove('ring-2', 'ring-primary/60'), 2500);
    onFocusHandled?.();
    return () => clearTimeout(t);
  }, [focusId, payments, outgoing, onFocusHandled]);

  // Scroll infinito: observa un centinela al final de la lista y pide más al entrar en viewport.
  useEffect(() => {
    if (!hasMore || loading) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: '400px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, onLoadMore, payments.length]);

  // Qué se pinta es una decisión pura (ver paymentsListState.ts): loading > error > los
  // tres vacíos > la lista. Extraída para poder probarla sin montar este componente.
  const listState = getPaymentsListState({
    loading,
    error,
    paymentsCount: payments.length,
    attention,
    hasActiveFilters,
  });

  if (listState === 'loading') {
    return (
      <>
        <TableSkeleton />
        <CardsSkeleton />
      </>
    );
  }

  // El fallo de la consulta no es una bandeja vacía: los comprobantes siguen guardados.
  if (listState === 'error') {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No se pudieron cargar los pagos"
        description={`${error}. Los comprobantes siguen guardados; solo falló la consulta.`}
        actions={
          <Button size="lg" onClick={onRetry}>
            <RotateCcw className="h-4 w-4" />
            Reintentar
          </Button>
        }
      />
    );
  }

  // Quedarse sin nada por atender es un logro, no un vacío: se dice como tal.
  if (listState === 'empty-attention') {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Todo conciliado"
        description="No queda ningún comprobante por atender. Los nuevos aparecerán aquí en cuanto el bot los procese."
        actions={
          <Button variant="outline" size="lg" onClick={onResetFilters}>
            Ver todos los pagos
          </Button>
        }
      />
    );
  }

  if (listState === 'empty-filtered' || listState === 'empty-none') {
    const hasFilters = listState === 'empty-filtered';
    return (
      <EmptyState
        icon={hasFilters ? SlidersHorizontal : Banknote}
        title={hasFilters ? 'No hay pagos con estos filtros' : 'Aún no hay pagos'}
        description={
          hasFilters
            ? 'Prueba ajustando la búsqueda, el rango de fechas o el estado.'
            : 'Los pagos se registran cuando el bot procesa comprobantes de WhatsApp.'
        }
        actions={
          hasFilters ? (
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
      {/* Desktop: tabla densa. */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card lg:block">
        <PaymentRowHeader />
        {payments.map((p) => (
          <PaymentRow
            key={p.uuid}
            payment={p}
            outgoing={outgoing}
            suggestion={suggestions[p.id]}
            onManage={onManage}
          />
        ))}
      </div>

      {/* Mobile / tablet: la misma fila en tarjeta. */}
      <div className="space-y-2.5 lg:hidden">
        {payments.map((p) => (
          <PaymentItem
            key={p.uuid}
            payment={p}
            outgoing={outgoing}
            suggestion={suggestions[p.id]}
            onManage={onManage}
          />
        ))}
      </div>

      {/* Centinela + indicador de carga incremental */}
      <div ref={sentinelRef} className="flex min-h-10 items-center justify-center">
        {loadingMore ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando más…
          </span>
        ) : !hasMore ? (
          <span className="flex min-h-9 w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
            Fin de la lista · «No hay más pagos»
          </span>
        ) : null}
      </div>
    </div>
  );
}
