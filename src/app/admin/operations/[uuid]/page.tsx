'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ExternalLink,
  FileQuestion,
  Handshake,
  Link2,
  ChevronRight,
  PackageCheck,
  Pencil,
  PiggyBank,
  ReceiptText,
  Send,
  Tag,
  Trash2,
  Truck,
  Undo2,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { formatCaracasDateTime, formatNumber } from '@/utils/functions';
import { getStatusMeta } from '@/utils/operationStatus';
import { operationService } from '@/services/operationService';
import { paymentService } from '@/services/paymentService';
import { useConfirm } from '@/hooks/useConfirm';
import type { PaymentData } from '@/types/payment';
import type { OperationStatus, OrphanAction, UnlinkPreview } from '@/types/operation';
import { UnlinkOrphanDialog } from '@/app/admin/payments/_components/UnlinkOrphanDialog';
import { LinkPaymentDialog } from './_components/LinkPaymentDialog';
import { OperationEditDrawer } from './_components/OperationEditDrawer';
import { PaymentDetailDrawer } from './_components/PaymentDetailDrawer';
import { useOperationDetail } from './_hooks/useOperationDetail';

const SCENARIO_LABELS = {
  NORMAL: 'Normal',
  ZELLE_DIRECT: 'Zelle directo',
  VIA_PARTNER: 'Vía socio',
} as const;

const NO_FUND_VALUE = '__no_fund__';

function stripPhone(phone: string | null) {
  return (phone || '').replace(/@(c|g)\.us$/, '');
}

function formatDate(value: string | null) {
  return formatCaracasDateTime(value);
}

function formatOperationNotes(notes: string) {
  return notes
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed === '[cancel] client_revoked_message') {
        return 'El cliente eliminó el mensaje. La operación fue cancelada automáticamente.';
      }
      if (trimmed.startsWith('[cancel] ')) {
        const reason = trimmed.slice('[cancel] '.length).replaceAll('_', ' ');
        return `Operación cancelada: ${reason}`;
      }
      return line;
    })
    .join('\n');
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <div className="min-w-0 text-right font-medium text-foreground">{children}</div>
    </div>
  );
}

function PaymentItem({
  payment,
  incoming,
  onOpen,
}: {
  payment: PaymentData;
  incoming: boolean;
  onOpen: () => void;
}) {
  const description = [
    incoming ? 'Entrante' : 'Saliente',
    payment.provider,
    payment.bank_to || payment.bank_from,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-start justify-between gap-3 rounded-lg border border-border px-3 py-3 text-left transition-colors hover:bg-muted/50 sm:px-4"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {incoming ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">
            {payment.amount != null ? formatNumber(payment.amount) : '—'} {payment.currency ?? ''}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
          {/* Un mismo comprobante puede repartirse entre varias operaciones: aquí se ve
              qué parte respalda a ESTA. */}
          {incoming
            && payment.allocated_to_operation != null
            && payment.amount != null
            && Math.abs(payment.allocated_to_operation - payment.amount) > 0.01 ? (
            <p className="mt-1 truncate text-xs text-amber-600 dark:text-amber-400">
              {formatNumber(payment.allocated_to_operation)} {payment.currency ?? ''} de este
              comprobante son de esta operación
            </p>
          ) : null}
          {/* Un saliente cubre una parte del valor del trato: a qué tasa quedó esa parte y
              cuánto se aparta de la que se cotizó. */}
          {!incoming && payment.settled_amount != null ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              Cubre {formatNumber(payment.settled_amount)}
              {payment.settled_rate ? ` · tasa ${formatNumber(payment.settled_rate)}` : ''}
              {payment.settled_reference_rate && payment.settled_rate
                && Math.abs(payment.settled_rate - payment.settled_reference_rate) > 0.0001 ? (
                <span className="text-amber-600 dark:text-amber-400">
                  {' '}(cotizada {formatNumber(payment.settled_reference_rate)})
                </span>
              ) : null}
            </p>
          ) : null}
          {payment.reference ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">Ref. {payment.reference}</p>
          ) : null}
        </div>
      </div>

      <div className="flex max-w-36 shrink-0 flex-wrap items-center justify-end gap-1.5 self-center">
        {incoming && payment.deposit ? (
          <StatusBadge tone="success" icon={PiggyBank}>Depósito</StatusBadge>
        ) : incoming && payment.fund_group_name ? (
          <StatusBadge tone="info" icon={PiggyBank}>Contabilizado</StatusBadge>
        ) : null}
        {!incoming && payment.is_personal_expense ? (
          <StatusBadge tone="warning" icon={Tag}>Personal</StatusBadge>
        ) : null}
        {!incoming && payment.is_irrelevant ? (
          <StatusBadge tone="neutral" icon={Tag}>Irrelevante</StatusBadge>
        ) : null}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}

export default function OperationDetailPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const {
    operation,
    payments,
    pairs,
    clients,
    funds,
    loading,
    pairsLoading,
    clientsLoading,
    fundsLoading,
    notFound,
    paymentsError,
    reloadPayments,
    updateFund,
    updateDetails,
    updateValue,
    markDelivered,
  } = useOperationDetail(uuid);
  const [editOpen, setEditOpen] = useState(false);
  const [linkPaymentOpen, setLinkPaymentOpen] = useState(false);
  const [editingFund, setEditingFund] = useState(false);
  const [selectedFundUuid, setSelectedFundUuid] = useState(NO_FUND_VALUE);
  const [savingFund, setSavingFund] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [savingSettle, setSavingSettle] = useState(false);
  const [markingDelivered, setMarkingDelivered] = useState(false);
  const [viewingPayment, setViewingPayment] = useState<{
    table: 'incoming' | 'outgoing';
    payment: PaymentData;
  } | null>(null);
  // Desvincular el último comprobante: el cuadro decide si la op se borra o se conserva.
  const [orphan, setOrphan] = useState<{
    preview: UnlinkPreview;
    table: 'incoming' | 'outgoing';
    payment: PaymentData;
  } | null>(null);
  const [resolvingOrphan, setResolvingOrphan] = useState(false);
  const [deletingOperation, setDeletingOperation] = useState(false);
  const confirm = useConfirm();
  const router = useRouter();

  if (loading) {
    return <LoadingState label="Cargando operación..." fullHeight />;
  }

  if (notFound || !operation) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/operations"
          className={cn(buttonVariants({ variant: 'ghost' }), 'min-h-11 w-fit px-3')}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a operaciones
        </Link>
        <EmptyState
          icon={FileQuestion}
          title="Operación no encontrada"
          description="La operación que buscas no existe o ya no está disponible."
        />
      </div>
    );
  }

  const status = getStatusMeta(operation.status);
  const client = operation.client_display_name || stripPhone(operation.client_phone) || 'Cliente';
  const pair = operation.pair_symbol || `${operation.from_currency ?? '?'}-${operation.to_currency ?? '?'}`;
  const scenario = operation.scenario ?? 'NORMAL';
  const linkedPayments = [...(payments?.incoming ?? []), ...(payments?.outgoing ?? [])];
  const operationNotes = operation.notes ? formatOperationNotes(operation.notes) : null;
  const selectedFund = funds.find((fund) => fund.uuid === selectedFundUuid);

  // Corregir cuánto vale el trato. A diferencia de la corrección vieja, sube y baja.
  const newValue = parseFloat(settleAmount.replace(',', '.'));
  const newValueValid = !Number.isNaN(newValue) && newValue > 0;

  // Entrega de USD efectivo: PENDING → RECEIVED (una sola dirección).
  const confirmDelivered = async () => {
    const ok = await confirm({
      title: 'Marcar entrega recibida',
      description: 'Confirmas que ya recibiste los USD en efectivo de esta operación. Esta acción no se puede deshacer.',
      confirmText: 'Marcar entregada',
    });
    if (!ok) return;
    setMarkingDelivered(true);
    const res = await markDelivered();
    setMarkingDelivered(false);
    if (res.success) {
      toast.success('Entrega marcada como recibida');
    } else {
      toast.error(res.error || 'No se pudo marcar la entrega');
    }
  };

  // Desvincula un pago de esta operación (queda libre para vincularlo a otra desde
  // Pagos o desde el detalle de la op correcta). Si es el ÚNICO comprobante, antes de
  // soltarlo hay que decidir qué pasa con la operación (cuadro aparte).
  // Devuelve true si se desvinculó (el drawer se cierra con eso).
  const unlinkPayment = async (table: 'incoming' | 'outgoing', payment: PaymentData) => {
    const preview = await paymentService.unlinkPreview(table, payment.id);
    if (preview.success && preview.data?.would_orphan) {
      setOrphan({ preview: preview.data, table, payment });
      return true;
    }
    const ok = await confirm({
      title: 'Desvincular pago',
      description: `El pago de ${payment.amount != null ? formatNumber(payment.amount) : '—'} ${payment.currency ?? ''} quedará sin operación y podrás vincularlo a la correcta desde Pagos.`,
      confirmText: 'Desvincular',
    });
    if (!ok) return false;
    const res = await paymentService.linkOperation(table, payment.id, null);
    if (res.success) {
      toast.success('Pago desvinculado de la operación');
      reloadPayments();
      return true;
    }
    toast.error(res.error || 'No se pudo desvincular el pago');
    return false;
  };

  const resolveOrphan = async (action: OrphanAction, note: string | null) => {
    if (!orphan) return;
    setResolvingOrphan(true);
    const res = await paymentService.linkOperation(orphan.table, orphan.payment.id, null, {
      action,
      note,
    });
    setResolvingOrphan(false);
    if (!res.success) {
      toast.error(res.error || 'No se pudo desvincular el pago');
      return;
    }
    setOrphan(null);
    if (action === 'DELETE_OPERATION') {
      toast.success('Pago desvinculado y operación borrada con su transacción');
      router.push('/admin/operations');
      return;
    }
    toast.success('Pago desvinculado — la operación queda registrada sin pago asociado');
    reloadPayments();
  };

  // Op que ya quedó sin comprobantes: se puede borrar con su rastro contable.
  const deleteOperation = async () => {
    const ok = await confirm({
      title: 'Eliminar operación',
      description:
        'Se borrará la operación junto con su transacción contable y los movimientos que dejó ' +
        'en el fondo. Los comprobantes no se tocan. No se puede deshacer.',
      confirmText: 'Eliminar',
      variant: 'destructive',
    });
    if (!ok) return;
    setDeletingOperation(true);
    const res = await operationService.deleteOperation(operation.uuid);
    setDeletingOperation(false);
    if (res.success) {
      toast.success('Operación eliminada');
      router.push('/admin/operations');
    } else {
      toast.error(res.error || 'No se pudo eliminar la operación');
    }
  };

  const saveValue = async () => {
    if (!newValueValid) return;
    setSavingSettle(true);
    const result = await updateValue(newValue);
    setSavingSettle(false);
    if (result.success) {
      toast.success(`Valor actualizado a ${formatNumber(newValue)} ${operation.currency ?? operation.from_currency}`);
      setCorrecting(false);
      setSettleAmount('');
      reloadPayments();
    } else {
      toast.error(result.error || 'No se pudo actualizar el valor');
    }
  };

  const saveDetails = async (
    currencyPairUuid: string,
    appliedPercentage: number | null,
    nextStatus: OperationStatus,
    clientPhone: string | null,
  ) => {
    const result = await updateDetails(currencyPairUuid, appliedPercentage, nextStatus, clientPhone);
    if (result.success) toast.success('Operación actualizada');
    return result;
  };

  const startFundEdit = () => {
    setSelectedFundUuid(operation.fund_group_uuid ?? NO_FUND_VALUE);
    setEditingFund(true);
  };

  const cancelFundEdit = () => {
    setSelectedFundUuid(operation.fund_group_uuid ?? NO_FUND_VALUE);
    setEditingFund(false);
  };

  const saveFund = async () => {
    const currentValue = operation.fund_group_uuid ?? NO_FUND_VALUE;
    if (selectedFundUuid === currentValue) {
      setEditingFund(false);
      return;
    }

    const fundGroupUuid = selectedFundUuid === NO_FUND_VALUE ? null : selectedFundUuid;
    setSavingFund(true);
    const result = await updateFund(fundGroupUuid);
    setSavingFund(false);

    if (result.success) {
      toast.success(fundGroupUuid ? 'Fondo vinculado a la operación' : 'Fondo desvinculado de la operación');
      setEditingFund(false);
    } else {
      toast.error(result.error || 'No se pudo actualizar el fondo');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/admin/operations"
        className={cn(buttonVariants({ variant: 'ghost' }), 'min-h-11 w-fit px-3')}
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a operaciones
      </Link>

      <PageHeader
        title={client}
        description={`${stripPhone(operation.client_phone)} · ${pair} · ${operation.uuid.slice(0, 8)}`}
        actions={
          <>
            <StatusBadge
              tone={
                operation.fund_group_name
                  ? operation.transaction_uuid ? 'success' : 'info'
                  : 'neutral'
              }
              icon={PiggyBank}
            >
              {operation.fund_group_name
                ? `${operation.transaction_uuid ? 'Fondo aplicado' : 'Fondo asignado'}: ${operation.fund_group_name}`
                : 'Sin fondo vinculado'}
            </StatusBadge>
            {scenario !== 'NORMAL' ? (
              <StatusBadge
                tone={scenario === 'ZELLE_DIRECT' ? 'primary' : 'info'}
                icon={scenario === 'ZELLE_DIRECT' ? Send : Handshake}
              >
                {SCENARIO_LABELS[scenario]}
              </StatusBadge>
            ) : null}
            {operation.no_payments_ack_at ? (
              <StatusBadge
                tone="warning"
                icon={AlertTriangle}
                className={operation.no_payments_ack_note ? 'cursor-help' : undefined}
              >
                <span title={operation.no_payments_ack_note ?? undefined}>
                  Sin pago asociado · aceptado por {operation.no_payments_ack_by_username ?? '—'}
                  {' · '}
                  {formatDate(operation.no_payments_ack_at)}
                </span>
              </StatusBadge>
            ) : null}
            <StatusBadge tone={status.tone} icon={status.icon}>
              {status.label}
            </StatusBadge>
          </>
        }
      />

      <OperationEditDrawer
        open={editOpen}
        operation={operation}
        pairs={pairs}
        clients={clients}
        pairsLoading={pairsLoading}
        clientsLoading={clientsLoading}
        onOpenChange={setEditOpen}
        onSave={saveDetails}
      />

      <LinkPaymentDialog
        operation={operation}
        open={linkPaymentOpen}
        onClose={() => setLinkPaymentOpen(false)}
        onLinked={reloadPayments}
      />

      <PaymentDetailDrawer
        payment={viewingPayment?.payment ?? null}
        table={viewingPayment?.table ?? 'incoming'}
        onClose={() => setViewingPayment(null)}
        onUnlink={unlinkPayment}
      />

      <UnlinkOrphanDialog
        preview={orphan?.preview ?? null}
        submitting={resolvingOrphan}
        onCancel={() => setOrphan(null)}
        onDecide={resolveOrphan}
      />

      <Card>
        <CardContent className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            {/* El valor del trato manda: es lo que entrega el cliente y sobre lo que se
                contabiliza, sin importar en cuántas monedas se haya pagado. */}
            <p className="text-sm text-muted-foreground">Valor de la operación</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2 text-xl font-semibold text-foreground sm:text-2xl">
              <span>
                {formatNumber(operation.amount ?? operation.from_amount)}{' '}
                {operation.currency ?? operation.from_currency}
              </span>
              {operation.amount_usdt != null ? (
                <span className="text-sm font-normal text-muted-foreground">
                  ≈ {formatNumber(operation.amount_usdt)} USDT
                  {operation.bcv_amount != null
                    ? ` · ${formatNumber(operation.bcv_amount)} USD BCV`
                    : ''}
                </span>
              ) : null}
            </div>
            {(operation.pending_amount ?? 0) > 0.01 ? (
              <p className="mt-1 text-sm">
                <span className="text-muted-foreground">Entregado </span>
                <span className="font-medium text-foreground">
                  {formatNumber(operation.delivered_amount ?? 0)} de{' '}
                  {formatNumber(operation.amount ?? operation.from_amount)}
                </span>
                <span className="text-amber-600 dark:text-amber-400">
                  {' '}· pendiente {formatNumber(operation.pending_amount ?? 0)}{' '}
                  {operation.currency ?? operation.from_currency}
                </span>
              </p>
            ) : null}
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              Cotizado: {formatNumber(operation.from_amount)} {operation.from_currency}
              <ArrowRight className="h-3 w-3" />
              {formatNumber(operation.to_amount)} {operation.to_currency}
            </p>
          </div>
          <div className="flex items-center gap-3 sm:flex-col sm:items-end">
            <div className="sm:text-right">
              <p className="text-sm text-muted-foreground">Tasa cotizada</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{formatNumber(operation.rate_used)}</p>
            </div>
            {!correcting ? (
              <Button
                variant="ghost"
                className="min-h-11 px-3"
                onClick={() => {
                  setSettleAmount(String(operation.amount ?? operation.from_amount));
                  setCorrecting(true);
                }}
              >
                <Undo2 className="h-4 w-4" />
                Editar valor
              </Button>
            ) : null}
          </div>
        </CardContent>
        {correcting ? (
          <CardContent className="border-t px-4 pt-4 sm:px-6">
            {/* El valor se corrige hacia arriba y hacia abajo: subirlo era imposible con la
                corrección vieja, que solo sabía achicar la operación. */}
            <div className="space-y-2 rounded-lg bg-muted/60 p-3">
              <label htmlFor="settle-amount" className="text-sm font-medium text-foreground">
                Valor de la operación ({operation.currency ?? operation.from_currency})
              </label>
              <Input
                id="settle-amount"
                type="text"
                inputMode="decimal"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                placeholder={formatNumber(operation.amount ?? operation.from_amount)}
                className="h-11"
                autoFocus
              />
              {newValueValid && newValue !== (operation.amount ?? operation.from_amount) ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  La cotización se reescala a{' '}
                  {formatNumber(
                    Math.round(newValue * (operation.to_amount / operation.from_amount) * 100) / 100,
                  )}{' '}
                  {operation.to_currency}.
                  {newValue < (operation.amount ?? operation.from_amount) ? (
                    <>
                      {' '}Lo que sobre del comprobante quedará{' '}
                      <span className="font-semibold text-amber-600 dark:text-amber-400">sin asignar</span>,
                      para repartirlo a otra operación o acreditarlo al saldo.
                    </>
                  ) : (
                    <>
                      {' '}Faltará cubrir{' '}
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {formatNumber(
                          Math.round((newValue - (operation.delivered_amount ?? 0)) * 100) / 100,
                        )}{' '}
                        {operation.currency ?? operation.from_currency}
                      </span>{' '}
                      con los pagos de salida.
                    </>
                  )}
                </p>
              ) : settleAmount.trim() !== '' && !newValueValid ? (
                <p className="text-xs text-destructive">El valor debe ser mayor a 0.</p>
              ) : (
                <p className="text-xs leading-5 text-muted-foreground">
                  Cuánto vale el trato para el cliente. Los pagos de salida dicen cómo se cubre.
                </p>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="ghost"
                  className="min-h-11"
                  onClick={() => {
                    setCorrecting(false);
                    setSettleAmount('');
                  }}
                  disabled={savingSettle}
                >
                  Cancelar
                </Button>
                <Button
                  className="min-h-11"
                  onClick={saveValue}
                  disabled={savingSettle || !newValueValid}
                >
                  {savingSettle ? 'Guardando…' : 'Guardar valor'}
                </Button>
              </div>
            </div>
          </CardContent>
        ) : null}
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Datos de la operación</CardTitle>
                <Button
                  variant="ghost"
                  className="min-h-11 px-3"
                  onClick={() => setEditOpen(true)}
                  disabled={pairsLoading}
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="divide-y divide-border">
                <DetailRow label="Par">{pair}</DetailRow>
                <DetailRow label="Monto definido por">
                  {operation.amount_side === 'RECEIVE' ? 'Monto a recibir' : 'Monto a enviar'}
                </DetailRow>
                {operation.applied_percentage != null ? (
                  <DetailRow label="Margen aplicado">{operation.applied_percentage}%</DetailRow>
                ) : null}
                {operation.bcv_usd != null ? (
                  <DetailRow label="Referencia BCV">{formatNumber(operation.bcv_usd)}</DetailRow>
                ) : null}
                {operation.delivery_status ? (
                  <DetailRow label="Entrega">
                    {operation.delivery_status === 'RECEIVED' ? (
                      <StatusBadge tone="success" icon={PackageCheck}>Entregada</StatusBadge>
                    ) : (
                      <span className="inline-flex flex-wrap items-center justify-end gap-2">
                        <StatusBadge tone="warning" icon={Truck}>Por entregar</StatusBadge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={confirmDelivered}
                          disabled={markingDelivered}
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                          {markingDelivered ? 'Marcando…' : 'Marcar entregada'}
                        </Button>
                      </span>
                    )}
                  </DetailRow>
                ) : null}
                {operation.transaction_uuid && !operation.fund_group_uuid ? (
                  <DetailRow label="Transacción">
                    <Link
                      href={`/admin/transactions/${operation.transaction_uuid}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Ver transacción
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </DetailRow>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {operationNotes ? (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Notas y datos de pago</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                  {operationNotes}
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Pagos vinculados ({linkedPayments.length})</CardTitle>
                <Button
                  variant="ghost"
                  className="min-h-11 px-3"
                  onClick={() => setLinkPaymentOpen(true)}
                >
                  <Link2 className="h-4 w-4" />
                  Vincular pago
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 px-4 sm:px-6">
              {paymentsError ? (
                <p className="rounded-lg bg-destructive/10 px-3 py-3 text-sm text-destructive">
                  {paymentsError}
                </p>
              ) : linkedPayments.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <ReceiptText className="h-7 w-7 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium text-foreground">Sin pagos vinculados</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Los comprobantes asociados aparecerán en esta sección.
                  </p>
                  {/* Una op sin ningún comprobante no debería quedarse en el sistema si no
                      fue una decisión: aquí se borra con su transacción y sus movimientos. */}
                  <Button
                    variant="outline"
                    className="mt-4 min-h-11 text-destructive hover:text-destructive"
                    onClick={deleteOperation}
                    disabled={deletingOperation}
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingOperation ? 'Eliminando…' : 'Eliminar operación'}
                  </Button>
                </div>
              ) : (
                <>
                  {payments?.incoming.map((payment) => (
                    <PaymentItem
                      key={`incoming-${payment.id}`}
                      payment={payment}
                      incoming
                      onOpen={() => setViewingPayment({ table: 'incoming', payment })}
                    />
                  ))}
                  {payments?.outgoing.map((payment) => (
                    <PaymentItem
                      key={`outgoing-${payment.id}`}
                      payment={payment}
                      incoming={false}
                      onOpen={() => setViewingPayment({ table: 'outgoing', payment })}
                    />
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Asignación</CardTitle>
                {!editingFund ? (
                  <Button
                    variant="ghost"
                    className="min-h-11 px-3"
                    onClick={startFundEdit}
                    disabled={fundsLoading}
                  >
                    <Pencil className="h-4 w-4" />
                    {operation.fund_group_uuid ? 'Cambiar fondo' : 'Agregar fondo'}
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="px-4">
              {editingFund ? (
                <div className="my-3 space-y-3 rounded-lg bg-muted/60 p-3">
                  <div className="space-y-1.5">
                    <label htmlFor="operation-fund" className="text-sm font-medium text-foreground">
                      Fondo de la operación
                    </label>
                    <Select
                      value={selectedFundUuid}
                      onValueChange={(value) => setSelectedFundUuid(value ?? NO_FUND_VALUE)}
                      disabled={savingFund}
                    >
                      <SelectTrigger id="operation-fund" className="h-11 w-full">
                        <SelectValue>
                          {selectedFundUuid === NO_FUND_VALUE
                            ? 'Sin fondo vinculado'
                            : selectedFund?.name ?? operation.fund_group_name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectItem value={NO_FUND_VALUE}>Sin fondo vinculado</SelectItem>
                        {funds.map((fund) => (
                          <SelectItem
                            key={fund.uuid}
                            value={fund.uuid}
                            disabled={!fund.is_active && fund.uuid !== operation.fund_group_uuid}
                          >
                            {fund.name} · {fund.currency}{fund.is_active ? '' : ' · Inactivo'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {funds.length === 0 ? (
                      <p className="text-xs leading-5 text-muted-foreground">
                        No hay fondos creados. Puedes administrarlos desde la sección Fondos.
                      </p>
                    ) : (
                      <p className="text-xs leading-5 text-muted-foreground">
                        Al vincular el fondo se genera la transacción con el estado actual de la operación.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                      variant="ghost"
                      className="min-h-11"
                      onClick={cancelFundEdit}
                      disabled={savingFund}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="min-h-11"
                      onClick={saveFund}
                      disabled={
                        savingFund ||
                        selectedFundUuid === (operation.fund_group_uuid ?? NO_FUND_VALUE)
                      }
                    >
                      {savingFund ? 'Guardando...' : 'Guardar fondo'}
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="divide-y divide-border">
                <DetailRow label="Cliente">
                  {operation.client_uuid ? (
                    <Link
                      href={`/admin/clients/${operation.client_uuid}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <UserRound className="h-3.5 w-3.5" />
                      {client}
                    </Link>
                  ) : client}
                </DetailRow>
                <DetailRow label="Teléfono">{stripPhone(operation.client_phone) || '—'}</DetailRow>
                <DetailRow label="Escenario">{SCENARIO_LABELS[scenario]}</DetailRow>
                <DetailRow
                  label={operation.transaction_uuid ? 'Fondo aplicado' : 'Fondo'}
                >
                  {operation.fund_group_name ? (
                    <span className="inline-flex items-center gap-1">
                      <PiggyBank className="h-3.5 w-3.5" />
                      {operation.fund_group_name}
                    </span>
                  ) : 'No'}
                </DetailRow>
                {operation.fund_group_uuid && operation.transaction_uuid ? (
                  <DetailRow label="Transacción del fondo">
                    <Link
                      href={`/admin/transactions/${operation.transaction_uuid}`}
                      className="inline-flex min-h-11 items-center gap-1 text-primary hover:underline"
                    >
                      Ver transacción
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </DetailRow>
                ) : null}
                <DetailRow label="Recibido por">
                  {operation.received_by_username ? (
                    <span className="inline-flex items-center gap-1">
                      <Handshake className="h-3.5 w-3.5" />
                      {operation.received_by_username}
                    </span>
                  ) : 'Operador'}
                </DetailRow>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Fechas</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border px-4">
              <DetailRow label="Cotización">{formatDate(operation.quoted_at)}</DetailRow>
              {(payments?.outgoing ?? []).length > 0 ? (
                payments!.outgoing.map((p, i) => (
                  <DetailRow
                    key={p.id}
                    label={payments!.outgoing.length > 1 ? `Pago saliente ${i + 1}` : 'Pago saliente'}
                  >
                    {formatDate(p.created_at)}
                  </DetailRow>
                ))
              ) : (
                <DetailRow label="Pago saliente">—</DetailRow>
              )}
              {operation.cancelled_at ? (
                <DetailRow label="Cancelada">{formatDate(operation.cancelled_at)}</DetailRow>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Identificador</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <p className="break-all font-mono text-xs leading-5 text-muted-foreground">
                {operation.uuid}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
