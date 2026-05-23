'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { CurrenciesStats } from './_components/CurrenciesStats';
import { CurrenciesFilters } from './_components/CurrenciesFilters';
import { CurrenciesList } from './_components/CurrenciesList';
import { CurrencyFormDialog } from './_components/CurrencyFormDialog';
import { useCurrencies } from './_hooks/useCurrencies';

export default function CurrenciesAdminPage() {
  const { state, actions } = useCurrencies();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monedas"
        description="Gestiona las monedas disponibles para pares y transacciones."
        actions={
          <Button size="lg" onClick={actions.openCreate}>
            <Plus className="h-4 w-4" />
            Nueva Moneda
          </Button>
        }
      />

      <CurrenciesStats stats={state.stats} />

      <CurrenciesFilters
        filters={state.filters}
        hasActiveFilters={state.hasActiveFilters}
        onChange={actions.setFilters}
        onReset={actions.resetFilters}
      />

      <CurrenciesList
        currencies={state.currencies}
        loading={state.loading}
        hasActiveFilters={state.hasActiveFilters}
        onResetFilters={actions.resetFilters}
        onCreate={actions.openCreate}
        onEdit={actions.openEdit}
        onDelete={actions.handleDelete}
      />

      <CurrencyFormDialog
        mode="create"
        open={state.showCreateModal}
        value={state.formData}
        submitting={state.submitting}
        onChange={actions.setFormData}
        onSubmit={actions.handleCreate}
        onCancel={actions.closeCreate}
      />

      <CurrencyFormDialog
        mode="edit"
        open={!!state.editingCurrency}
        value={state.formData}
        submitting={state.submitting}
        onChange={actions.setFormData}
        onSubmit={actions.handleUpdate}
        onCancel={actions.closeEdit}
      />
    </div>
  );
}
