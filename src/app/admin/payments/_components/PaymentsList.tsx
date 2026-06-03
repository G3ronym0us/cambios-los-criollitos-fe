'use client';

import { Banknote, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import type { PaymentData } from '@/types/payment';
import { PaymentItem } from './PaymentItem';

interface PaymentsListProps {
  payments: PaymentData[];
  outgoing: boolean;
  loading: boolean;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  onLink?: (payment: PaymentData) => void;
}

export function PaymentsList({
  payments,
  outgoing,
  loading,
  hasActiveFilters,
  onResetFilters,
  onLink,
}: PaymentsListProps) {
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
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
      {payments.map((p) => (
        <PaymentItem key={p.uuid} payment={p} outgoing={outgoing} onLink={onLink} />
      ))}
    </div>
  );
}
