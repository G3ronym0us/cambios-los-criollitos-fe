'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, DollarSign, History, SearchX } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';
import RateHistoryModal from '../RateHistoryModal';
import { usePairDetail } from './_hooks/usePairDetail';
import { PairDetailForm } from './_components/PairDetailForm';
import { PairRateHeader } from './_components/PairRateHeader';

export default function CurrencyPairDetailPage() {
  const params = useParams();
  const uuid = params.uuid as string;
  const { state, actions } = usePairDetail(uuid);
  const [showHistory, setShowHistory] = useState(false);

  const backLink = (
    <Link
      href="/admin/currency-pairs"
      className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'w-fit')}
    >
      <ArrowLeft className="h-4 w-4" />
      Volver a pares
    </Link>
  );

  if (state.loading) {
    return (
      <div className="space-y-6">
        {backLink}
        <LoadingState label="Cargando par..." />
      </div>
    );
  }

  if (state.notFound || !state.pair) {
    return (
      <div className="space-y-6">
        {backLink}
        <EmptyState
          icon={SearchX}
          title="Par no encontrado"
          description="El par que buscas no existe o fue eliminado."
        />
      </div>
    );
  }

  const { pair } = state;

  return (
    <div className="space-y-6">
      {backLink}

      <PageHeader
        title={pair.display_name}
        description={pair.description || pair.pair_symbol}
        actions={
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowHistory(true)}
              className="flex-1 sm:flex-none"
            >
              <History className="h-4 w-4" />
              Historial
            </Button>
            <Link
              href={`/admin/currency-pairs/${pair.uuid}/configs`}
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'flex-1 sm:flex-none')}
            >
              <DollarSign className="h-4 w-4" />
              Comisiones
            </Link>
          </div>
        }
      />

      <PairRateHeader pair={pair} />

      <PairDetailForm
        key={pair.uuid}
        pair={pair}
        basePairs={state.basePairs}
        derivedPairs={state.derivedPairs}
        fiatSymbol={state.fiatSymbol}
        error={state.error}
        onSave={actions.save}
      />

      {showHistory ? (
        <RateHistoryModal
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          selectedPair={pair}
        />
      ) : null}
    </div>
  );
}
