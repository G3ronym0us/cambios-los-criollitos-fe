'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ExternalLink,
  FileQuestion,
  Handshake,
  Link2,
  Link2Off,
  PackageCheck,
  Pencil,
  PiggyBank,
  ReceiptText,
  Send,
  Tag,
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
import { formatNumber } from '@/utils/functions';
import { getStatusMeta } from '@/utils/operationStatus';
import { paymentService } from '@/services/paymentService';
import { useConfirm } from '@/hooks/useConfirm';
import type { PaymentData } from '@/types/payment';
import type { OperationStatus } from '@/types/operation';
import { LinkPaymentDialog } from './_components/LinkPaymentDialog';
import { OperationEditDrawer } from './_components/OperationEditDrawer';
import { useOperationDetail } from './_hooks/useOperationDetail';

const SCENARIO_LABELS = {
  NORMAL: 'Normal',
  ZELLE_DIRECT: 'Zelle directo',
  VIA_PARTNER: 'Vía socio',
} as const;

// Lados "from" que liquidan en USD: solo estos pueden acreditar excedente al saldo a favor.
const USD_SIDES = new Set(['USD', 'ZELLE', 'PAYPAL']);

const NO_FUND_VALUE = '__no_fund__';

function stripPhone(phone: string | null) {
  return (phone || '').replace(/@(c|g)\.us$/, '');
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
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
  onUnlink,
}: {
  payment: PaymentData;
  incoming: boolean;
  onUnlink?: () => void;
}) {
  const description = [
    incoming ? 'Entrante' : 'Saliente',
    payment.provider,
    payment.bank_to || payment.bank_from,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-3 sm:px-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {incoming ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">
            {payment.amount != null ? formatNumber(payment.amount) : '—'} {payment.currency ?? ''}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
          {payment.reference ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">Ref. {payment.reference}</p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div className="flex max-w-36 flex-wrap justify-end gap-1.5">
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
        </div>
        {onUnlink ? (
          <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground" onClick={onUnlink}>
            <Link2Off className="h-3.5 w-3.5" />
            Desvincular
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default function OperationDetailPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const {
    operation,
    payments,
    pairs,
    funds,
    loading,
    pairsLoading,
    fundsLoading,
    notFound,
    paymentsError,
    reloadPayments,
    updateFund,
    updateDetails,
    partialSettle,
  } = useOperationDetail(uuid);
  const [editOpen, setEditOpen] = useState(false);
  const [linkPaymentOpen, setLinkPaymentOpen] = useState(false);
  const [editingFund, setEditingFund] = useState(false);
  const [selectedFundUuid, setSelectedFundUuid] = useState(NO_FUND_VALUE);
  const [savingFund, setSavingFund] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [savingSettle, setSavingSettle] = useState(false);
  const confirm = useConfirm();

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

  // Corrección retroactiva: op COMPLETED con lado origen USD que se completó por el
  // total cuando el cliente solo cambió una parte.
  const canCorrect =
    operation.status === 'COMPLETED' &&
    USD_SIDES.has((operation.from_currency || '').toUpperCase());
  const settleValue = parseFloat(settleAmount.replace(',', '.'));
  const settleValid =
    !Number.isNaN(settleValue) && settleValue > 0 && settleValue < operation.from_amount - 0.01;
  const surplus = settleValid
    ? Math.round((operation.from_amount - settleValue) * 100) / 100
    : null;

  // Desvincula un pago de esta operación (queda libre para vincularlo a otra desde
  // Pagos o desde el detalle de la op correcta). No revierte estados ni transacciones.
  const unlinkPayment = async (table: 'incoming' | 'outgoing', payment: PaymentData) => {
    const ok = await confirm({
      title: 'Desvincular pago',
      description: `El pago de ${payment.amount != null ? formatNumber(payment.amount) : '—'} ${payment.currency ?? ''} quedará sin operación y podrás vincularlo a la correcta desde Pagos.`,
      confirmText: 'Desvincular',
    });
    if (!ok) return;
    const res = await paymentService.linkOperation(table, payment.id, null);
    if (res.success) {
      toast.success('Pago desvinculado de la operación');
      reloadPayments();
    } else {
      toast.error(res.error || 'No se pudo desvincular el pago');
    }
  };

  const saveSettle = async () => {
    if (surplus === null) return;
    setSavingSettle(true);
    const result = await partialSettle(settleValue);
    setSavingSettle(false);
    if (result.success && result.data) {
      toast.success(
        `Operación corregida — ${formatNumber(result.data.credited)} USD acreditados como saldo a favor (saldo: ${formatNumber(result.data.balance_after)})`,
      );
      setCorrecting(false);
      setSettleAmount('');
    } else {
      toast.error(result.error || 'No se pudo corregir la operación');
    }
  };

  const saveDetails = async (
    currencyPairUuid: string,
    appliedPercentage: number | null,
    nextStatus: OperationStatus,
  ) => {
    const result = await updateDetails(currencyPairUuid, appliedPercentage, nextStatus);
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
        pairsLoading={pairsLoading}
        onOpenChange={setEditOpen}
        onSave={saveDetails}
      />

      <LinkPaymentDialog
        operation={operation}
        open={linkPaymentOpen}
        onClose={() => setLinkPaymentOpen(false)}
        onLinked={reloadPayments}
      />

      <Card>
        <CardContent className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-sm text-muted-foreground">Conversión acordada</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xl font-semibold text-foreground sm:text-2xl">
              <span>{formatNumber(operation.from_amount)} {operation.from_currency}</span>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <span>{formatNumber(operation.to_amount)} {operation.to_currency}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:flex-col sm:items-end">
            <div className="sm:text-right">
              <p className="text-sm text-muted-foreground">Tasa utilizada</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{formatNumber(operation.rate_used)}</p>
            </div>
            {canCorrect && !correcting ? (
              <Button
                variant="ghost"
                className="min-h-11 px-3"
                onClick={() => setCorrecting(true)}
              >
                <Undo2 className="h-4 w-4" />
                Corregir monto
              </Button>
            ) : null}
          </div>
        </CardContent>
        {canCorrect && correcting ? (
          <CardContent className="border-t px-4 pt-4 sm:px-6">
            <div className="space-y-2 rounded-lg bg-muted/60 p-3">
              <label htmlFor="settle-amount" className="text-sm font-medium text-foreground">
                Monto realmente cambiado ({operation.from_currency})
              </label>
              <Input
                id="settle-amount"
                type="text"
                inputMode="decimal"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                placeholder={`Menor que ${formatNumber(operation.from_amount)}`}
                className="h-11"
                autoFocus
              />
              {surplus !== null ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  La operación (y su transacción) quedará en {formatNumber(settleValue)}{' '}
                  {operation.from_currency} → {formatNumber(Math.round(settleValue * (operation.to_amount / operation.from_amount) * 100) / 100)}{' '}
                  {operation.to_currency}, y se acreditarán{' '}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatNumber(surplus)} USD
                  </span>{' '}
                  como saldo a favor del cliente.
                </p>
              ) : settleAmount.trim() !== '' ? (
                <p className="text-xs text-destructive">
                  Debe ser mayor a 0 y menor que {formatNumber(operation.from_amount)}.
                </p>
              ) : (
                <p className="text-xs leading-5 text-muted-foreground">
                  El resto del monto original se acredita como saldo a favor. Solo se puede
                  corregir una vez por operación.
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
                  onClick={saveSettle}
                  disabled={savingSettle || surplus === null}
                >
                  {savingSettle ? 'Corrigiendo…' : 'Corregir y acreditar'}
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
                      <StatusBadge tone="warning" icon={Truck}>Por entregar</StatusBadge>
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
                </div>
              ) : (
                <>
                  {payments?.incoming.map((payment) => (
                    <PaymentItem
                      key={`incoming-${payment.id}`}
                      payment={payment}
                      incoming
                      onUnlink={() => unlinkPayment('incoming', payment)}
                    />
                  ))}
                  {payments?.outgoing.map((payment) => (
                    <PaymentItem
                      key={`outgoing-${payment.id}`}
                      payment={payment}
                      incoming={false}
                      onUnlink={() => unlinkPayment('outgoing', payment)}
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
              <DetailRow label="Cotizada">{formatDate(operation.quoted_at)}</DetailRow>
              <DetailRow label="Expira">{formatDate(operation.expires_at)}</DetailRow>
              {operation.approved_at ? (
                <DetailRow label="Aprobada">{formatDate(operation.approved_at)}</DetailRow>
              ) : null}
              {operation.completed_at ? (
                <DetailRow label="Completada">{formatDate(operation.completed_at)}</DetailRow>
              ) : null}
              {operation.cancelled_at ? (
                <DetailRow label="Cancelada">{formatDate(operation.cancelled_at)}</DetailRow>
              ) : null}
              <DetailRow label="Creada">{formatDate(operation.created_at)}</DetailRow>
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
