'use client';

import Link from 'next/link';
import { Banknote, Eye, FileText, Forward, Link2, Link2Off, PiggyBank, Tag, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getStatusMeta } from '@/utils/operationStatus';
import { formatNumber } from '@/utils/functions';
import type { PaymentData } from '@/types/payment';

interface PaymentItemProps {
  payment: PaymentData;
  outgoing: boolean;
  onLink?: (payment: PaymentData) => void;
  onViewRawText?: (payment: PaymentData) => void;
  onViewOperation?: (operationUuid: string) => void;
}

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function PaymentItem({ payment: p, outgoing, onLink, onViewRawText, onViewOperation }: PaymentItemProps) {
  const client = p.client_name || p.client_phone?.replace(/@(c|g)\.us$/, '') || 'Sin identificar';
  const created = formatDate(p.created_at);
  const bank = p.bank_to || p.bank_from || p.provider;
  const personal = !!p.is_personal_expense;
  const irrelevant = !!p.is_irrelevant;
  const deposit = p.deposit ?? null;
  const opMeta = getStatusMeta(p.operation_status);

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
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

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {p.operation_uuid ? (
              <StatusBadge tone={opMeta.tone} icon={opMeta.icon}>{opMeta.label}</StatusBadge>
            ) : deposit ? (
              <StatusBadge tone="success" icon={PiggyBank}>
                Depósito{deposit.method ? ` · ${deposit.method}` : ''}
              </StatusBadge>
            ) : (
              <StatusBadge tone="neutral" icon={Link2Off}>Sin vincular</StatusBadge>
            )}
            {outgoing && personal ? (
              <StatusBadge tone="warning" icon={Tag}>Personal</StatusBadge>
            ) : null}
            {outgoing && irrelevant ? (
              <StatusBadge tone="neutral" icon={Tag}>Irrelevante</StatusBadge>
            ) : null}
            {outgoing && p.source_payment_id ? (
              <StatusBadge tone="info" icon={Forward}>Reenvío</StatusBadge>
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
            {onViewOperation && p.operation_uuid ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => onViewOperation(p.operation_uuid!)}
              >
                <Eye className="h-3.5 w-3.5" />
                Ver
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
