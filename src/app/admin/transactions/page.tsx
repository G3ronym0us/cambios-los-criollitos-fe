'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { cn } from '@/lib/utils';
import { TransactionsFilters } from './_components/TransactionsFilters';
import { TransactionsList } from './_components/TransactionsList';
import { TransactionsPagination } from './_components/TransactionsPagination';
import { useTransactions } from './_hooks/useTransactions';

export default function TransactionsAdminPage() {
  const { state, actions } = useTransactions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transacciones"
        description="Gestiona las transacciones y ganancias del sistema."
        actions={
          <Link
            href="/admin/transactions/create"
            className={cn(buttonVariants({ size: 'lg' }))}
          >
            <Plus className="h-4 w-4" />
            Nueva transacción
          </Link>
        }
      />

      <TransactionsFilters
        draftFilters={state.draftFilters}
        hasActiveFilters={state.hasActiveFilters}
        currencyPairs={state.currencyPairs}
        onStatusChange={actions.setStatusDraft}
        onPairChange={actions.setPairDraft}
        onStartDateChange={actions.setStartDateDraft}
        onEndDateChange={actions.setEndDateDraft}
        onApply={actions.applyFilters}
        onReset={actions.resetFilters}
      />

      <TransactionsList
        transactions={state.transactions}
        loading={state.loading}
        hasActiveFilters={state.hasActiveFilters}
        onResetFilters={actions.resetFilters}
        onDelete={actions.handleDelete}
      />

      <TransactionsPagination
        page={state.page}
        totalPages={state.totalPages}
        total={state.total}
        onPageChange={actions.goToPage}
      />
    </div>
  );
}
