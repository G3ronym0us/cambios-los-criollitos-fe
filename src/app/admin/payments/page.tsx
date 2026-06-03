'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaymentTable } from '@/types/payment';
import { PaymentsFilters } from './_components/PaymentsFilters';
import { PaymentsList } from './_components/PaymentsList';
import { usePayments } from './_hooks/usePayments';

export default function PaymentsAdminPage() {
  const { state, actions } = usePayments();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pagos"
        description="Pagos entrantes y salientes detectados por el bot de WhatsApp."
      />

      <Tabs value={state.tab} onValueChange={(v) => actions.setTab(v as PaymentTable)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="incoming">Entrantes ({state.totalIncoming})</TabsTrigger>
          <TabsTrigger value="outgoing">Salientes ({state.totalOutgoing})</TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="space-y-4">
          <PaymentsFilters
            search={state.search}
            onSearchChange={actions.setSearch}
            showClassification={false}
            outClass={state.outClass}
            onClassChange={actions.setOutClass}
            hasActiveFilters={state.hasActiveFilters}
            onReset={actions.resetFilters}
          />
          <PaymentsList
            payments={state.incoming}
            outgoing={false}
            loading={state.loading}
            hasActiveFilters={state.hasActiveFilters}
            onResetFilters={actions.resetFilters}
          />
        </TabsContent>

        <TabsContent value="outgoing" className="space-y-4">
          <PaymentsFilters
            search={state.search}
            onSearchChange={actions.setSearch}
            showClassification
            outClass={state.outClass}
            onClassChange={actions.setOutClass}
            hasActiveFilters={state.hasActiveFilters}
            onReset={actions.resetFilters}
          />
          <PaymentsList
            payments={state.outgoing}
            outgoing
            loading={state.loading}
            hasActiveFilters={state.hasActiveFilters}
            onResetFilters={actions.resetFilters}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
