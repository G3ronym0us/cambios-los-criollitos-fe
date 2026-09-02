'use client';

import Link from 'next/link';
import { MoreHorizontal, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { getPaymentAction, getPaymentStatusMeta, getPaymentTag } from '@/utils/paymentStatus';
import type { PaymentData, PaymentSuggestion } from '@/types/payment';
import { rememberFocus } from './PaymentRow';
import { describePayment, describeSuggestion } from './paymentRowData';

interface PaymentItemProps {
  payment: PaymentData;
  outgoing: boolean;
  suggestion?: PaymentSuggestion;
  onManage?: (payment: PaymentData) => void;
}

/**
 * La misma fila, en tarjeta, para mobile. La acción principal ocupa el ancho y llega a los
 * 44px de alto: en el teléfono el operador atiende la bandeja con el pulgar.
 */
export function PaymentItem({ payment: p, outgoing, suggestion, onManage }: PaymentItemProps) {
  const d = describePayment(p);
  const status = getPaymentStatusMeta(p, outgoing);
  const tag = getPaymentTag(p, outgoing);
  const action = getPaymentAction(p, outgoing);
  const table = outgoing ? 'outgoing' : 'incoming';
  const suggestedLabel = suggestion ? describeSuggestion(suggestion) : null;

  return (
    <div
      id={`payment-row-${table}-${p.id}`}
      className={cn(
        'rounded-xl border border-border bg-card p-3',
        status.attention &&
          (status.tone === 'destructive'
            ? 'shadow-[inset_3px_0_0] shadow-destructive'
            : 'shadow-[inset_3px_0_0] shadow-amber-500'),
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {p.client_uuid ? (
            <Link
              href={`/admin/clients/${p.client_uuid}`}
              className="block truncate text-sm font-semibold text-foreground hover:underline"
            >
              {d.client}
            </Link>
          ) : (
            <div className="truncate text-sm font-semibold text-foreground">{d.client}</div>
          )}
          <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
            {p.operation_uuid && d.operation ? d.operation : d.source}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div
            className={cn(
              'text-[15px] font-bold tabular-nums',
              p.amount == null ? 'text-destructive' : 'text-foreground',
            )}
          >
            {d.amount}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {/* `when` es hora sola si el pago es de hoy, y día + hora si no: aquí solo
                cabe un renglón y antes se perdía la fecha por completo. */}
            {p.amount == null ? d.when : `${d.method} · ${d.when}`}
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <StatusBadge
          tone={status.tone}
          icon={status.icon}
          className={cn('max-w-full', status.dashed && 'border-dashed')}
        >
          <span className="truncate">{status.label}</span>
        </StatusBadge>
        {tag ? (
          <StatusBadge tone={tag.tone} icon={tag.icon}>
            {tag.label}
          </StatusBadge>
        ) : null}
        {suggestedLabel && !p.operation_uuid ? (
          <StatusBadge tone="primary" icon={Sparkles}>
            <span className="truncate">Sugerida {suggestedLabel}</span>
          </StatusBadge>
        ) : null}
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        {onManage ? (
          <Button
            variant={action.variant === 'primary' ? 'default' : 'outline'}
            size="lg"
            onClick={() => onManage(p)}
            className={cn(
              'h-11 flex-1',
              action.variant === 'danger' && 'border-destructive/40 text-destructive',
              action.variant === 'outline' && action.label === 'Vincular' && 'border-primary/40 text-primary',
            )}
          >
            {suggestedLabel && action.label === 'Vincular' ? 'Vincular sugerida' : action.label}
          </Button>
        ) : null}
        {p.operation_uuid ? (
          <Link
            href={`/admin/operations/${p.operation_uuid}`}
            onClick={() => rememberFocus(table, p.id)}
            aria-label="Ver operación"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
