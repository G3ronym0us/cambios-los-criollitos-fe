'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import CreateCurrencyPairModal from '@/components/admin/CreateCurrencyPairModal';
import EditCurrencyPairModal from '@/components/admin/EditCurrencyPairModal';
import ManualRateDialog from '@/components/ManualRateDialog';
import RateHistoryModal from './RateHistoryModal';
import { PairsStats } from './_components/PairsStats';
import { PairsFilters } from './_components/PairsFilters';
import { PairsList } from './_components/PairsList';
import { BinanceConfigDialog } from './_components/BinanceConfigDialog';
import { useCurrencyPairs } from './_hooks/useCurrencyPairs';

export default function CurrencyPairsAdminPage() {
  const { state, actions } = useCurrencyPairs();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pares de Monedas"
        description="Gestiona los pares de monedas, sus tasas y configuración de Binance P2P."
        actions={
          <Button size="lg" onClick={actions.openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo Par
          </Button>
        }
      />

      <PairsStats stats={state.stats} />

      <PairsFilters
        filters={state.filters}
        currencies={state.currencies}
        hasActiveFilters={state.hasActiveFilters}
        onChange={actions.setFilters}
        onReset={actions.resetFilters}
      />

      <PairsList
        pairs={state.pairs}
        loading={state.loading}
        hasActiveFilters={state.hasActiveFilters}
        onResetFilters={actions.resetFilters}
        onCreate={actions.openCreate}
        onEdit={actions.openEdit}
        onDelete={actions.handleDelete}
        onShowHistory={actions.openHistory}
        onManualRate={actions.openManualRate}
        onToggleActive={actions.handleToggleActive}
        onToggleMonitored={actions.handleToggleMonitored}
        onToggleBinance={actions.handleToggleBinanceTracked}
      />

      <CreateCurrencyPairModal
        isOpen={state.showCreateModal}
        onClose={actions.closeCreate}
        onSubmit={actions.handleCreate}
        currencies={state.currencies}
        basePairs={state.basePairs}
        error={state.error}
        setError={actions.setError}
        validateBinanceForm={actions.validateBinanceForm}
        getFiatCurrencyFromPair={actions.getFiatCurrencyFromPair}
      />

      <EditCurrencyPairModal
        isOpen={!!state.editingPair}
        onClose={actions.closeEdit}
        onSubmit={actions.handleUpdate}
        editingPair={state.editingPair}
        basePairs={state.basePairs}
        error={state.error}
        setError={actions.setError}
        validateBinanceForm={actions.validateBinanceForm}
        getFiatCurrencyFromPair={actions.getFiatCurrencyFromPair}
      />

      <BinanceConfigDialog
        pair={state.binanceTargetPair}
        value={state.binanceConfig}
        error={state.error}
        onChange={actions.setBinanceConfig}
        onSubmit={actions.handleSaveBinanceConfig}
        onCancel={actions.closeBinanceConfig}
      />

      {state.historyPair ? (
        <RateHistoryModal
          isOpen={!!state.historyPair}
          onClose={actions.closeHistory}
          selectedPair={state.historyPair}
        />
      ) : null}

      {state.manualRatePair ? (
        <ManualRateDialog
          isOpen={!!state.manualRatePair}
          onClose={actions.closeManualRate}
          onSetRate={actions.handleSetManualRate}
          onRemoveRate={actions.handleRemoveManualRate}
          fromCurrency={state.manualRatePair.from_currency.symbol}
          toCurrency={state.manualRatePair.to_currency.symbol}
          currentRate={state.manualRateInfo.currentRate}
          automaticRate={state.manualRateInfo.automaticRate}
          isManual={state.manualRateInfo.isManual}
          isLoading={state.manualRateLoading}
        />
      ) : null}
    </div>
  );
}
