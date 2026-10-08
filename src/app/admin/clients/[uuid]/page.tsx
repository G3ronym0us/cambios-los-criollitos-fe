'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Ban, Coins, Eye, HandCoins, Truck, Users, UserX, Wallet, Tag } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { ClientAccountTab } from './_components/ClientAccountTab';
import { ClientSettingsTab } from './_components/ClientSettingsTab';
import { ClientLoansTab } from './_components/ClientLoansTab';
import { useClientProfile } from './_hooks/useClientProfile';
import {
  formatPendingBreakdown,
  isCashDebt,
  isPendingOperation,
  pendingByPair,
  pendingTotals,
} from '../_lib/pending';

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

/**
 * La bandeja de pagos ya filtrada a este cliente y a lo que espera una decisión. Busca por
 * teléfono (la bandeja no filtra por cliente); en un grupo no hay teléfono útil y va el nombre.
 */
function paymentsHref(phone: string, name: string | null, table: 'incoming' | 'outgoing') {
  const params = new URLSearchParams();
  if (table === 'outgoing') params.set('tab', 'outgoing');
  params.set('q', isGroup(phone) ? (name ?? '') : formatPhone(phone));
  params.set('att', 'ATTENTION');
  return `/admin/payments?${params.toString()}`;
}

function UnlinkedPaymentsNotice({
  incoming,
  outgoing,
  phone,
  name,
}: {
  incoming: number;
  outgoing: number;
  phone: string;
  name: string | null;
}) {
  if (incoming === 0 && outgoing === 0) return null;
  const parts = [
    incoming > 0
      ? { table: 'incoming' as const, label: `${incoming} ${incoming === 1 ? 'entrante' : 'entrantes'}` }
      : null,
    outgoing > 0
      ? { table: 'outgoing' as const, label: `${outgoing} ${outgoing === 1 ? 'saliente' : 'salientes'}` }
      : null,
  ].filter((part) => part !== null);

  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-card p-3">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
      <p className="text-xs leading-relaxed text-muted-foreground">
        Este cliente tiene{' '}
        <strong className="font-semibold text-foreground">pagos sin vincular</strong>:{' '}
        {parts.map((part, index) => (
          <span key={part.table}>
            {index > 0 ? ' y ' : ''}
            <Link
              href={paymentsHref(phone, name, part.table)}
              className="font-semibold text-foreground underline underline-offset-2"
            >
              {part.label}
            </Link>
          </span>
        ))}
        . Mientras no respalden una operación, la cuenta no los ve.
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

const TABS = ['settings', 'account', 'loans'] as const;
type ClientTab = (typeof TABS)[number];
const DEFAULT_TAB: ClientTab = 'settings';

function isClientTab(value: string | null): value is ClientTab {
  return TABS.includes(value as ClientTab);
}

function ClientProfileContent() {
  const { uuid } = useParams<{ uuid: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // La pestaña vive en `?tab=` para que recargar o compartir el enlace no te devuelva a
  // Configuración. La de por defecto no se escribe, así la URL limpia sigue siendo válida.
  const tabParam = searchParams.get('tab');
  const tab: ClientTab = isClientTab(tabParam) ? tabParam : DEFAULT_TAB;
  const selectTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === DEFAULT_TAB) params.delete('tab');
    else params.set('tab', value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const { state, actions } = useClientProfile(uuid);
  const {
    client, loading, notFound, saving, operations, operationsLoading, pairs,
    balance, balanceLoading, loans, loansLoading, loanTotals, unlinked,
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
        {client.is_rate_setter ? <StatusBadge tone="info" icon={Tag}>Fija tasa</StatusBadge> : null}
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
            {formatPendingBreakdown(pendingEntries)}{' '}
            {isCashDebt(pendingEntries) ? 'que nos debe' : 'por entregar'}
          </StatusBadge>
        ) : null}
      </div>

      <UnlinkedPaymentsNotice
        incoming={unlinked.incoming}
        outgoing={unlinked.outgoing}
        phone={client.phone}
        name={client.display_name}
      />

      {/* Tres pestañas, no cinco: Transacciones, Por entregar y Saldo eran el mismo hilo
          contado tres veces y ahora son filtros dentro de Cuenta. Préstamos se queda aparte
          —vive en tres monedas, se revalúa a diario y tiene abonos anidados—, y
          Configuración no se toca. */}
      <Tabs value={tab} onValueChange={(v) => selectTab(v as string)}>
        <TabsList className="h-auto w-full flex-wrap sm:w-auto">
          <TabsTrigger value="settings">Configuración</TabsTrigger>
          <TabsTrigger value="account" className="gap-1.5">
            Cuenta
            {!operationsLoading && pendingTotal.operations > 0 ? (
              <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white">
                {pendingTotal.operations}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="loans">
            Préstamos{!loansLoading ? ` (${loans.length})` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <ClientSettingsTab
            client={client}
            pairs={pairs}
            operations={operations}
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

        {/* `keepMounted`: el deshacer de la sesión vive en el estado de la pestaña, y sin
            esto cambiar de pestaña y volver lo borraría sin avisar. */}
        <TabsContent value="account" keepMounted>
          <ClientAccountTab
            clientUuid={uuid}
            operations={operations}
            operationsLoading={operationsLoading}
            balance={balance}
            balanceLoading={balanceLoading}
            loanTotals={loanTotals}
            hasOpenLoan={hasOpenLoan}
            onAdjustBalance={actions.adjustBalance}
            onChanged={actions.reloadOperations}
          />
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

// useSearchParams (la pestaña en la URL) exige un boundary de Suspense al prerenderizar.
export default function ClientProfilePage() {
  return (
    <Suspense fallback={<LoadingState label="Cargando cliente..." />}>
      <ClientProfileContent />
    </Suspense>
  );
}
