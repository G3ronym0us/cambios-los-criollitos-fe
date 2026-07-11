'use client';

import { Suspense, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaymentData, PaymentTable } from '@/types/payment';
import { PaymentsFilters } from './_components/PaymentsFilters';
import { PaymentsList } from './_components/PaymentsList';
import { IncomingPaymentActionDialog } from './_components/IncomingPaymentActionDialog';
import { OutgoingPaymentActionDialog } from './_components/OutgoingPaymentActionDialog';
import { PaymentRawTextDialog } from './_components/PaymentRawTextDialog';
import { usePayments } from './_hooks/usePayments';

function PaymentsAdminContent() {
  const { state, actions } = usePayments();
  const [actioningIncoming, setActioningIncoming] = useState<PaymentData | null>(null);
  const [actioning, setActioning] = useState<PaymentData | null>(null);
  const [viewingRawText, setViewingRawText] = useState<PaymentData | null>(null);

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

        <TabsContent
          value="incoming"
          className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-200"
        >
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
            payments={state.payments}
            outgoing={false}
            loading={state.loading}
            loadingMore={state.loadingMore}
            hasMore={state.hasMore}
            onLoadMore={actions.loadMore}
            hasActiveFilters={state.hasActiveFilters}
            onResetFilters={actions.resetFilters}
            onLink={setActioningIncoming}
            onViewRawText={setViewingRawText}
            focusId={state.tab === 'incoming' ? state.focusId : null}
            onFocusHandled={actions.clearFocus}
          />
        </TabsContent>

        <TabsContent
          value="outgoing"
          className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-200"
        >
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
            payments={state.payments}
            outgoing
            loading={state.loading}
            loadingMore={state.loadingMore}
            hasMore={state.hasMore}
            onLoadMore={actions.loadMore}
            hasActiveFilters={state.hasActiveFilters}
            onResetFilters={actions.resetFilters}
            onLink={setActioning}
            onViewRawText={setViewingRawText}
            focusId={state.tab === 'outgoing' ? state.focusId : null}
            onFocusHandled={actions.clearFocus}
          />
        </TabsContent>
      </Tabs>

      {/* Tras vincular/marcar, refrescar EN SITIO: la lista conserva las páginas ya
          cargadas y el scroll (no vuelve al principio). */}
      <IncomingPaymentActionDialog
        payment={actioningIncoming}
        onClose={() => setActioningIncoming(null)}
        onDone={actions.refreshInPlace}
      />

      <OutgoingPaymentActionDialog
        payment={actioning}
        onClose={() => setActioning(null)}
        onDone={actions.refreshInPlace}
      />

      <PaymentRawTextDialog
        payment={viewingRawText}
        onClose={() => setViewingRawText(null)}
      />

    </div>
  );
}

// useSearchParams (filtros en la URL) exige un boundary de Suspense al prerenderizar.
export default function PaymentsAdminPage() {
  return (
    <Suspense fallback={<LoadingState label="Cargando pagos..." fullHeight />}>
      <PaymentsAdminContent />
    </Suspense>
  );
}
