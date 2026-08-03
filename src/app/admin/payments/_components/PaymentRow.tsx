'use client';

import Link from 'next/link';
import { MoreHorizontal, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { getPaymentAction, getPaymentStatusMeta, getPaymentTag } from '@/utils/paymentStatus';
import type { PaymentData, PaymentSuggestion } from '@/types/payment';
import { PAYMENT_FOCUS_KEY } from '../_hooks/usePayments';
import { describePayment, describeSuggestion } from './paymentRowData';

export interface PaymentRowProps {
  payment: PaymentData;
  outgoing: boolean;
  suggestion?: PaymentSuggestion;
  onManage?: (payment: PaymentData) => void;
}

/** Rejilla compartida por la cabecera y las filas: un solo sitio donde cuadran las columnas. */
export const ROW_GRID =
  'grid grid-cols-[7rem_minmax(0,1fr)_9rem_10rem_4.5rem_5.5rem] items-center gap-2.5 px-3.5';

export function rememberFocus(table: 'incoming' | 'outgoing', id: number) {
  try {
    window.sessionStorage.setItem(PAYMENT_FOCUS_KEY, JSON.stringify({ table, id }));
  } catch {
    /* storage no disponible */
  }
}

export function PaymentRow({ payment: p, outgoing, suggestion, onManage }: PaymentRowProps) {
  const d = describePayment(p);
  const status = getPaymentStatusMeta(p, outgoing);
  const tag = getPaymentTag(p, outgoing);
  const action = getPaymentAction(p, outgoing);
  const table = outgoing ? 'outgoing' : 'incoming';

  return (
    <div
      id={`payment-row-${table}-${p.id}`}
      className={cn(
        ROW_GRID,
        'h-14 border-t border-border/60 transition-colors first:border-t-0 hover:bg-muted/40',
        // La barra ámbar es la señal de "esto espera algo de ti", legible sin leer el badge.
        status.attention && 'shadow-[inset_3px_0_0] shadow-amber-500',
      )}
    >
      <div className="min-w-0">
        <div
          className={cn(
            'truncate text-sm font-bold tabular-nums',
            p.amount == null ? 'text-destructive' : 'text-foreground',
          )}
        >
          {d.amount}
        </div>
        <div className="truncate text-[11px] text-muted-foreground">
          {p.amount == null ? 'monto no leído' : d.method}
        </div>
      </div>

      <div className="min-w-0">
        {p.client_uuid ? (
          <Link
            href={`/admin/clients/${p.client_uuid}`}
            className="block truncate text-[13px] font-semibold text-foreground hover:underline"
          >
            {d.client}
          </Link>
        ) : (
          <div className="truncate text-[13px] font-semibold text-foreground">{d.client}</div>
        )}
        <div className="truncate text-[11.5px] text-muted-foreground">{d.source}</div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-1">
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
      </div>

      <div className="min-w-0 text-xs">
        {p.operation_uuid ? (
          <Link
            href={`/admin/operations/${p.operation_uuid}`}
            onClick={() => rememberFocus(table, p.id)}
            className="block truncate text-foreground hover:underline"
          >
            {d.operation ?? 'Ver operación'}
          </Link>
        ) : suggestion ? (
          <span
            className="flex items-center gap-1.5 text-primary"
            title={`Sugerida por el matcher${suggestion.confident ? '' : ' (hay otra candidata igual de cerca)'}`}
          >
            <Sparkles className={cn('h-3 w-3 shrink-0', !suggestion.confident && 'opacity-60')} />
            <span className="truncate">{describeSuggestion(suggestion)}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">{d.operation ?? '—'}</span>
        )}
      </div>

      <div className="text-xs tabular-nums text-foreground">
        {d.time}
        <div className="text-[11px] text-muted-foreground">{d.day}</div>
      </div>

      <div className="justify-self-end">
        {onManage ? (
          <Button
            variant={action.variant === 'primary' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onManage(p)}
            className={cn(
              'h-7 px-2.5 text-xs',
              action.variant === 'danger' && 'border-destructive/40 text-destructive hover:bg-destructive/10',
              action.variant === 'outline' && action.label === 'Vincular' && 'border-primary/40 text-primary',
            )}
          >
            {action.label}
          </Button>
        ) : (
          <MoreHorizontal aria-hidden className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

export function PaymentRowHeader() {
  return (
    <div
      className={cn(
        ROW_GRID,
        'h-9 shrink-0 border-b border-border bg-muted/60 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground',
      )}
    >
      <span>Monto</span>
      <span>Cliente · origen</span>
      <span>Estado</span>
      <span>Operación</span>
      <span>Recibido</span>
      <span className="sr-only">Acciones</span>
    </div>
  );
}
