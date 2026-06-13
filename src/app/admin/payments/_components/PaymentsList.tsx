'use client';

import { useEffect, useRef } from 'react';
import { Banknote, Loader2, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import type { PaymentData } from '@/types/payment';
import { PaymentItem } from './PaymentItem';

interface PaymentsListProps {
  payments: PaymentData[];
  outgoing: boolean;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  onLink?: (payment: PaymentData) => void;
  onViewRawText?: (payment: PaymentData) => void;
  onViewOperation?: (operationUuid: string) => void;
}

export function PaymentsList({
  payments,
  outgoing,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  hasActiveFilters,
  onResetFilters,
  onLink,
  onViewRawText,
  onViewOperation,
}: PaymentsListProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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

  if (loading) {
    return <LoadingState label="Cargando pagos..." />;
  }

  if (payments.length === 0) {
    return (
      <EmptyState
        icon={hasActiveFilters ? SlidersHorizontal : Banknote}
        title={hasActiveFilters ? 'No hay pagos con estos filtros' : 'Aún no hay pagos'}
        description={
          hasActiveFilters
            ? 'Prueba ajustando los filtros de búsqueda.'
            : 'Los pagos se registran cuando el bot procesa comprobantes de WhatsApp.'
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
    <div className="space-y-4">
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        {payments.map((p) => (
          <PaymentItem
            key={p.uuid}
            payment={p}
            outgoing={outgoing}
            onLink={onLink}
            onViewRawText={onViewRawText}
            onViewOperation={onViewOperation}
          />
        ))}
      </div>

      {/* Centinela + indicador de carga incremental */}
      <div ref={sentinelRef} className="flex h-10 items-center justify-center">
        {loadingMore ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando más…
          </span>
        ) : !hasMore ? (
          <span className="text-xs text-muted-foreground">No hay más pagos</span>
        ) : null}
      </div>
    </div>
  );
}
