'use client';

import { Suspense, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaymentData, PaymentTable } from '@/types/payment';
import { PaymentsAttentionStrip } from './_components/PaymentsAttentionStrip';
import { PaymentsFilters } from './_components/PaymentsFilters';
import { PaymentsList } from './_components/PaymentsList';
import { IncomingPaymentDrawer } from './_components/IncomingPaymentDrawer';
import { OutgoingPaymentActionDialog } from './_components/OutgoingPaymentActionDialog';
import { SaveClientDefaultDialog } from './_components/SaveClientDefaultDialog';
import { BulkIrrelevantBar, BulkSelectToggle } from './_components/BulkIrrelevantBar';
import { usePayments } from './_hooks/usePayments';
import { usePaymentSelection } from './_hooks/usePaymentSelection';

function PaymentsAdminContent() {
  const { state, actions } = usePayments();
  const [actioningIncoming, setActioningIncoming] = useState<PaymentData | null>(null);
  const [actioning, setActioning] = useState<PaymentData | null>(null);
  const [savingClientData, setSavingClientData] = useState<PaymentData | null>(null);

  const showConvertedIncoming = (payment: PaymentData) => {
    setActioning(null);
    actions.showPayment('incoming', payment.id);
    setActioningIncoming(payment);
  };

  const showConvertedOutgoing = (payment: PaymentData) => {
    setActioningIncoming(null);
    actions.showPayment('outgoing', payment.id);
    setActioning(payment);
  };

  const outgoing = state.tab === 'outgoing';
  const selection = usePaymentSelection(state.tab, state.payments, actions.refreshInPlace);

  // Filtros y lista son idénticos en las dos pestañas salvo la clasificación de salientes;
  // se comparten para que un cambio no se quede a medias en una de las dos.
  const filters = (
    <PaymentsFilters
      search={state.search}
      onSearchChange={actions.setSearch}
      showClassification={outgoing}
      outClass={state.outClass}
      onClassChange={actions.setOutClass}
      attention={state.attention}
      onAttentionChange={actions.setAttention}
      range={state.range}
      onRangeChange={actions.setRange}
      hasActiveFilters={state.hasActiveFilters}
      onReset={actions.resetFilters}
      shown={state.payments.length}
      total={state.total}
      counts={state.attentionCounts}
    />
  );

  const list = (
    <PaymentsList
      payments={state.payments}
      outgoing={outgoing}
      loading={state.loading}
      loadingMore={state.loadingMore}
      error={state.error}
      hasMore={state.hasMore}
      onLoadMore={actions.loadMore}
      onRetry={actions.reload}
      hasActiveFilters={state.hasActiveFilters}
      onResetFilters={actions.resetFilters}
      attention={state.attention}
      suggestions={state.suggestions}
      onManage={outgoing ? setActioning : setActioningIncoming}
      focusId={state.focusId}
      onFocusHandled={actions.clearFocus}
      selection={
        selection.state.active
          ? {
              selected: selection.state.selected,
              selectableIds: selection.state.selectableIds,
              allSelected: selection.state.allSelected,
              someSelected: selection.state.someSelected,
              onToggle: selection.actions.toggle,
              onToggleAll: selection.actions.toggleAll,
            }
          : undefined
      }
    />
  );

  // Seleccionar va con la lista: sólo tiene sentido cuando hay algo cargado.
  const bulk =
    state.payments.length > 0 ? <BulkSelectToggle selection={selection} /> : null;

  return (
    <div className="space-y-5">
      {/* En móvil el título vive en la barra superior (ver `admin/layout.tsx`): repetirlo
          aquí gastaba el primer tercio de la pantalla antes de la primera fila. */}
      <PageHeader
        title="Pagos"
        description="Comprobantes de WhatsApp leídos por el bot. Entrantes y salientes."
        className="hidden lg:flex"
      />

      <PaymentsAttentionStrip
        stats={state.stats}
        attention={state.attention}
        onAttentionChange={actions.setAttention}
        outgoing={outgoing}
      />

      <Tabs value={state.tab} onValueChange={(v) => actions.setTab(v as PaymentTable)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="incoming">Entrantes ({state.totalIncoming})</TabsTrigger>
          <TabsTrigger value="outgoing">Salientes ({state.totalOutgoing})</TabsTrigger>
        </TabsList>

        <TabsContent
          value="incoming"
          className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-1 duration-200"
        >
          {!outgoing ? filters : null}
          {!outgoing ? bulk : null}
          {!outgoing ? list : null}
        </TabsContent>

        <TabsContent
          value="outgoing"
          className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-1 duration-200"
        >
          {outgoing ? filters : null}
          {outgoing ? bulk : null}
          {outgoing ? list : null}
        </TabsContent>
      </Tabs>

      <BulkIrrelevantBar selection={selection} />

      {/* Tras vincular/marcar, refrescar EN SITIO: la lista conserva las páginas ya
          cargadas y el scroll (no vuelve al principio). */}
      <IncomingPaymentDrawer
        payment={actioningIncoming}
        onClose={() => setActioningIncoming(null)}
        onDone={actions.refreshInPlace}
        onConverted={showConvertedOutgoing}
        onSaveClientData={setSavingClientData}
      />

      <OutgoingPaymentActionDialog
        payment={actioning}
        onClose={() => setActioning(null)}
        onDone={actions.refreshInPlace}
        onConverted={showConvertedIncoming}
      />

      <SaveClientDefaultDialog
        payment={savingClientData}
        onClose={() => setSavingClientData(null)}
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
