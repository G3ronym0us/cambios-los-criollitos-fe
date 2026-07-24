'use client';

import Link from 'next/link';
import { Banknote, Eye, FileText, Forward, HandCoins, IdCard, Link2, Link2Off, PiggyBank, Split, Tag, Users, Wallet } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getStatusMeta } from '@/utils/operationStatus';
import { formatCaracasDateTime, formatNumber } from '@/utils/functions';
import { canBeDefaultAccount } from '@/utils/paymentBlock';
import { PAYMENT_FOCUS_KEY } from '../_hooks/usePayments';
import type { PaymentData } from '@/types/payment';

interface PaymentItemProps {
  payment: PaymentData;
  outgoing: boolean;
  onLink?: (payment: PaymentData) => void;
  onViewRawText?: (payment: PaymentData) => void;
  onSaveClientData?: (payment: PaymentData) => void;
}

function formatDate(value: string | null) {
  if (!value) return null;
  return formatCaracasDateTime(value);
}

export function PaymentItem({ payment: p, outgoing, onLink, onViewRawText, onSaveClientData }: PaymentItemProps) {
  const client = p.client_name || p.client_phone?.replace(/@(c|g)\.us$/, '') || 'Sin identificar';
  const created = formatDate(p.created_at);
  const bank = p.bank_to || p.bank_from || p.provider;
  const personal = !!p.is_personal_expense;
  const irrelevant = !!p.is_irrelevant;
  const deposit = p.deposit ?? null;
  const loan = p.loan ?? null;
  const opMeta = getStatusMeta(p.operation_status);

  return (
    <Card
      id={`payment-card-${outgoing ? 'out' : 'in'}-${p.id}`}
      className="overflow-hidden transition-shadow hover:shadow-md"
    >
      <CardContent className="space-y-3 p-4 sm:p-5">
        <header className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
            >
              {outgoing ? <Wallet className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              {p.client_uuid ? (
                <Link
                  href={`/admin/clients/${p.client_uuid}`}
                  className="truncate text-base font-semibold text-foreground hover:underline"
                >
                  {client}
                </Link>
              ) : (
                <h3 className="truncate text-base font-semibold text-foreground">{client}</h3>
              )}
              {bank ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{bank}</p> : null}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-base font-bold text-foreground">
              {p.amount != null ? formatNumber(p.amount) : '—'}
            </p>
            <p className="text-xs text-muted-foreground">{p.currency || ''}</p>
          </div>
        </header>

        {p.reference ? (
          <p className="truncate text-xs text-muted-foreground">Ref: {p.reference}</p>
        ) : null}
        {personal && p.personal_description ? (
          <p className="truncate text-xs text-muted-foreground">Gasto: {p.personal_description}</p>
        ) : null}
        {irrelevant && p.irrelevant_description ? (
          <p className="truncate text-xs text-muted-foreground">Motivo: {p.irrelevant_description}</p>
        ) : null}
        {deposit?.group_name ? (
          <p className="truncate text-xs text-muted-foreground">Fondo: {deposit.group_name}</p>
        ) : null}
        {loan ? (
          <p className="truncate text-xs text-muted-foreground">
            Saldo del préstamo: {formatNumber(loan.outstanding_amount)} {loan.preferred_currency === 'USD_BCV' ? 'USD (BCV)' : loan.preferred_currency}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {p.operation_uuid ? (
              <StatusBadge tone={opMeta.tone} icon={opMeta.icon}>{opMeta.label}</StatusBadge>
            ) : loan ? (
              <StatusBadge tone={loan.status === 'PAID' ? 'success' : 'warning'} icon={HandCoins}>
                {loan.status === 'PAID' ? 'Préstamo pagado' : 'Préstamo'}
              </StatusBadge>
            ) : deposit ? (
              <StatusBadge tone="success" icon={PiggyBank}>
                Depósito{deposit.method ? ` · ${deposit.method}` : ''}
              </StatusBadge>
            ) : !outgoing && p.fund_group_name ? (
              // Sin operación el comprobante todavía no está contabilizado en ningún lado:
              // tiene fondo asignado, pero ni op ni movimiento. Decirlo tal cual.
              <StatusBadge tone="warning" icon={Users}>
                {p.fund_group_name} · sin operación
              </StatusBadge>
            ) : outgoing && personal ? (
              <StatusBadge tone="warning" icon={Tag}>Personal</StatusBadge>
            ) : outgoing && irrelevant ? (
              <StatusBadge tone="neutral" icon={Tag}>Irrelevante</StatusBadge>
            ) : (
              <StatusBadge tone="neutral" icon={Link2Off}>Sin vincular</StatusBadge>
            )}
            {outgoing && p.source_payment_id ? (
              <StatusBadge tone="info" icon={Forward}>Reenvío</StatusBadge>
            ) : null}
            {/* El comprobante trae más de lo que cubren sus operaciones: hay que asignarlo
                a otro cambio o acreditarlo al saldo del cliente. */}
            {!outgoing && (p.unassigned_amount ?? 0) > 0.01 ? (
              <StatusBadge tone="warning" icon={Split}>
                {formatNumber(p.unassigned_amount ?? 0)} sin asignar
              </StatusBadge>
            ) : null}
            {!outgoing && (p.allocations_count ?? 0) > 1 ? (
              <StatusBadge tone="info" icon={Split}>
                Reparto en {p.allocations_count} ops
              </StatusBadge>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {onViewRawText && p.raw_text ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => onViewRawText(p)}
              >
                <FileText className="h-3.5 w-3.5" />
                Ver texto
              </Button>
            ) : null}
            {p.operation_uuid ? (
              <Link
                href={`/admin/operations/${p.operation_uuid}`}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-8')}
                onClick={() => {
                  // Al volver atrás, la lista restaura filtros (URL) y hace scroll a esta card.
                  try {
                    window.sessionStorage.setItem(
                      PAYMENT_FOCUS_KEY,
                      JSON.stringify({ table: outgoing ? 'outgoing' : 'incoming', id: p.id }),
                    );
                  } catch {
                    /* storage no disponible */
                  }
                }}
              >
                <Eye className="h-3.5 w-3.5" />
                Ver operación
              </Link>
            ) : null}
            {onSaveClientData && p.client_uuid && canBeDefaultAccount(p) ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => onSaveClientData(p)}
                title="Guardar estos datos como los datos predeterminados del cliente"
              >
                <IdCard className="h-3.5 w-3.5" />
                Datos del cliente
              </Button>
            ) : null}
            {onLink ? (
              <Button variant="outline" size="sm" className="h-8" onClick={() => onLink(p)}>
                <Link2 className="h-3.5 w-3.5" />
                Gestionar
              </Button>
            ) : null}
            {created ? <span className="text-xs text-muted-foreground">{created}</span> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
