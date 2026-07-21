'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, DollarSign, SearchX } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { usePairDetail } from './_hooks/usePairDetail';
import { PairDetailForm } from './_components/PairDetailForm';

export default function CurrencyPairDetailPage() {
  const params = useParams();
  const uuid = params.uuid as string;
  const { state, actions } = usePairDetail(uuid);

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
          <Link
            href={`/admin/currency-pairs/${pair.uuid}/configs`}
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full sm:w-auto')}
          >
            <DollarSign className="h-4 w-4" />
            Comisiones
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone="primary">{pair.pair_type.toUpperCase()}</StatusBadge>
        <StatusBadge tone={pair.is_active ? 'success' : 'neutral'}>
          {pair.is_active ? 'Activo' : 'Inactivo'}
        </StatusBadge>
        <StatusBadge tone={pair.is_monitored ? 'info' : 'neutral'}>
          {pair.is_monitored ? 'Monitoreado' : 'Sin monitorear'}
        </StatusBadge>
        {pair.binance_tracked ? <StatusBadge tone="warning">Binance P2P</StatusBadge> : null}
        {pair.rounding_mode ? (
          <StatusBadge tone="primary">
            Redondeo {pair.rounding_mode === 'RATE' ? 'de tasa' : 'de monto'}
          </StatusBadge>
        ) : null}
      </div>

      <PairDetailForm
        key={pair.uuid}
        pair={pair}
        basePairs={state.basePairs}
        fiatSymbol={state.fiatSymbol}
        error={state.error}
        onSave={actions.save}
      />
    </div>
  );
}
