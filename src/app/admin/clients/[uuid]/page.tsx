'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Ban, Coins, Eye, HandCoins, Receipt, Truck, Users, UserX, Wallet } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { OperationItem } from '../../operations/_components/OperationItem';
import { ClientBalanceTab } from './_components/ClientBalanceTab';
import { ClientPendingTab } from './_components/ClientPendingTab';
import { ClientSettingsTab } from './_components/ClientSettingsTab';
import { ClientLoansTab } from './_components/ClientLoansTab';
import { useClientProfile } from './_hooks/useClientProfile';
import { formatPendingBreakdown, isPendingOperation, pendingByPair, pendingTotals } from '../_lib/pending';

function isGroup(phone: string) {
  return phone.includes('@g.us');
}

function formatPhone(phone: string) {
  if (isGroup(phone)) return 'Grupo de WhatsApp';
  return phone.replace(/@c\.us$/, '');
}

// Fecha en hora local del operador (el timestamp viene en UTC del backend).
function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export default function ClientProfilePage() {
  const { uuid } = useParams<{ uuid: string }>();
  const { state, actions } = useClientProfile(uuid);
  const {
    client, loading, notFound, saving, operations, operationsLoading, pairs,
    balance, balanceLoading, loans, loansLoading, loanTotals,
  } = state;

  if (loading) {
    return <LoadingState label="Cargando cliente..." />;
  }

  if (notFound || !client) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/clients"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'w-fit')}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a clientes
        </Link>
        <EmptyState
          icon={UserX}
          title="Cliente no encontrado"
          description="El cliente que buscas no existe o fue eliminado."
        />
      </div>
    );
  }

  const group = isGroup(client.phone);
  const title = client.display_name || formatPhone(client.phone);

  // Lo que le debemos: el trozo sin cubrir de sus operaciones. Se calcula aquí para el
  // contador de la pestaña y el chip de la cabecera; la pestaña lo recalcula sobre las
  // mismas operaciones, sin volver a pedirlas.
  const pendingOperations = operations.filter(isPendingOperation);
  const pendingEntries = pendingByPair(pendingOperations);
  const pendingTotal = pendingTotals(pendingEntries);
  const hasOpenLoan = loans.some((loan) => loan.status === 'OPEN' || loan.status === 'PARTIAL');

  return (
    <div className="space-y-6">
      <Link
        href="/admin/clients"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'w-fit')}
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a clientes
      </Link>

      <PageHeader title={title} description={formatPhone(client.phone)} />

      <div className="flex flex-wrap items-center gap-2">
        {group ? <StatusBadge tone="neutral" icon={Users}>Grupo</StatusBadge> : null}
        {client.is_blocked ? <StatusBadge tone="destructive" icon={Ban}>Bloqueado</StatusBadge> : null}
        {client.is_tracked ? <StatusBadge tone="info" icon={Eye}>Seguido</StatusBadge> : null}
        {client.is_usdt_authorized ? <StatusBadge tone="success" icon={Coins}>USDT</StatusBadge> : null}
        {client.balance > 0 ? (
          <StatusBadge tone="success" icon={Wallet}>
            ${client.balance.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} a favor
          </StatusBadge>
        ) : null}
        {hasOpenLoan ? (
          <StatusBadge tone="warning" icon={HandCoins}>Préstamo pendiente</StatusBadge>
        ) : null}
        {pendingTotal.operations > 0 ? (
          <StatusBadge tone="destructive" icon={Truck}>
            {formatPendingBreakdown(pendingEntries)} por entregar
          </StatusBadge>
        ) : null}
      </div>

      <Tabs defaultValue="settings">
        <TabsList className="h-auto w-full flex-wrap sm:w-auto">
          <TabsTrigger value="settings">Configuración</TabsTrigger>
          <TabsTrigger value="transactions">
            Transacciones{!operationsLoading ? ` (${operations.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-1.5">
            Por entregar
            {!operationsLoading && pendingTotal.operations > 0 ? (
              <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white">
                {pendingTotal.operations}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="balance">
            Saldo{!balanceLoading && balance ? ` ($${balance.balance.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : ''}
          </TabsTrigger>
          <TabsTrigger value="loans">
            Préstamos{!loansLoading ? ` (${loans.length})` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <ClientSettingsTab
            client={client}
            pairs={pairs}
            saving={saving}
            onSave={actions.updateFields}
          />

          <Card>
            <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6">
              <Field label="Teléfono" value={formatPhone(client.phone)} />
              <Field label="Visto por última vez" value={formatDate(client.last_seen_at)} />
              <Field label="Creado" value={formatDate(client.created_at)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-3">
          {operationsLoading ? (
            <LoadingState label="Cargando transacciones..." />
          ) : operations.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Sin transacciones"
              description="Este cliente todavía no tiene operaciones registradas."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {operations.map((op) => (
                <OperationItem key={op.uuid} operation={op} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* `keepMounted`: el deshacer de la sesión vive en el estado de la pestaña, y sin
            esto cambiar de pestaña y volver lo borraría sin avisar. */}
        <TabsContent value="pending" keepMounted>
          <ClientPendingTab
            operations={operations}
            loading={operationsLoading}
            hasOpenLoan={hasOpenLoan}
            onChanged={actions.reload}
          />
        </TabsContent>

        <TabsContent value="balance">
          <ClientBalanceTab balance={balance} loading={balanceLoading} onAdjust={actions.adjustBalance} />
        </TabsContent>

        <TabsContent value="loans">
          <ClientLoansTab
            clientUuid={uuid}
            loans={loans}
            totals={loanTotals}
            loading={loansLoading}
            onRepayment={actions.addLoanRepayment}
            onCreateLoan={actions.createLoan}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
