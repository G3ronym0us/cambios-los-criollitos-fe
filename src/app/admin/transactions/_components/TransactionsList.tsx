'use client';

import Link from 'next/link';
import { Plus, Receipt, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { cn } from '@/lib/utils';
import type { TransactionData } from '@/types/transaction';
import { TransactionItem } from './TransactionItem';

interface TransactionsListProps {
  transactions: TransactionData[];
  loading: boolean;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  onDelete: (transaction: TransactionData) => void;
}

export function TransactionsList({
  transactions,
  loading,
  hasActiveFilters,
  onResetFilters,
  onDelete,
}: TransactionsListProps) {
  if (loading && transactions.length === 0) {
    return <LoadingState label="Cargando transacciones..." />;
  }

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={hasActiveFilters ? SlidersHorizontal : Receipt}
        title={
          hasActiveFilters ? 'No hay transacciones con estos filtros' : 'No hay transacciones'
        }
        description={
          hasActiveFilters
            ? 'Prueba ajustando los filtros o crea una nueva transacción.'
            : 'Comienza creando tu primera transacción.'
        }
        actions={
          <>
            {hasActiveFilters ? (
              <Button variant="outline" size="lg" onClick={onResetFilters}>
                <RotateCcw className="h-4 w-4" />
                Limpiar filtros
              </Button>
            ) : null}
            <Link
              href="/admin/transactions/create"
              className={cn(buttonVariants({ size: 'lg' }))}
            >
              <Plus className="h-4 w-4" />
              {hasActiveFilters ? 'Nueva transacción' : 'Crear primera transacción'}
            </Link>
          </>
        }
      />
    );
  }

  return (
    <div className="grid gap-3 sm:gap-4 xl:grid-cols-2">
      {transactions.map((transaction) => (
        <TransactionItem
          key={transaction.uuid}
          transaction={transaction}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
