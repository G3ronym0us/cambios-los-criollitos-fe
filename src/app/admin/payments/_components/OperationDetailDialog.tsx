'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  ExternalLink,
  Handshake,
  PackageCheck,
  PiggyBank,
  Send,
  Tag,
  Truck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { operationService, type OperationPayments } from '@/services/operationService';
import { getStatusMeta } from '@/utils/operationStatus';
import { formatNumber } from '@/utils/functions';
import type { OperationData } from '@/types/operation';
import type { PaymentData } from '@/types/payment';

interface OperationDetailDialogProps {
  operationUuid: string | null;
  onClose: () => void;
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

function stripPhone(phone: string | null) {
  return (phone || '').replace(/@(c|g)\.us$/, '');
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right font-medium text-foreground">{children}</span>
    </div>
  );
}

const SCENARIO_LABEL: Record<string, string> = {
  NORMAL: 'Normal',
  ZELLE_DIRECT: 'Zelle directo',
  VIA_PARTNER: 'Vía socio',
};

function PayRow({ p, incoming }: { p: PaymentData; incoming: boolean }) {
  const sub = [incoming ? 'Entrante' : 'Saliente', p.provider, p.bank_to || p.bank_from]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
        >
          {incoming ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {p.amount != null ? formatNumber(p.amount) : '—'} {p.currency ?? ''}
          </p>
          <p className="truncate text-xs text-muted-foreground">{sub}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
        {incoming && p.deposit ? (
          <StatusBadge tone="success" icon={PiggyBank}>Depósito</StatusBadge>
        ) : incoming && p.fund_group_name ? (
          <StatusBadge tone="info" icon={Users}>Contabilizado</StatusBadge>
        ) : null}
        {!incoming && p.is_personal_expense ? (
          <StatusBadge tone="warning" icon={Tag}>Personal</StatusBadge>
        ) : null}
        {!incoming && p.is_irrelevant ? (
          <StatusBadge tone="neutral" icon={Tag}>Irrelevante</StatusBadge>
        ) : null}
      </div>
    </div>
  );
}

export function OperationDetailDialog({ operationUuid, onClose }: OperationDetailDialogProps) {
  const [op, setOp] = useState<OperationData | null>(null);
  const [payments, setPayments] = useState<OperationPayments | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!operationUuid) return;
    let active = true;
    setOp(null);
    setPayments(null);
    setLoading(true);
    Promise.all([
      operationService.getOperation(operationUuid),
      operationService.getOperationPayments(operationUuid),
    ]).then(([opRes, payRes]) => {
      if (!active) return;
      if (opRes.success && opRes.data) setOp(opRes.data);
      else toast.error(opRes.error || 'No se pudo cargar la operación');
      if (payRes.success && payRes.data) setPayments(payRes.data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [operationUuid]);

  const meta = getStatusMeta(op?.status);
  const client = op?.client_display_name || stripPhone(op?.client_phone ?? null) || 'Cliente';
  const pair = op?.pair_symbol || (op ? `${op.from_currency ?? '?'}-${op.to_currency ?? '?'}` : '');

  return (
    <Dialog open={operationUuid !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalle de la operación</DialogTitle>
          <DialogDescription>Datos de la operación y sus pagos entrantes y salientes.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Cargando operación…</p>
        ) : !op ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No se encontró la operación.</p>
        ) : (
          <div className="-mx-1 flex-1 space-y-3 overflow-y-auto px-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-foreground">{client}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{pair}</p>
              </div>
              <StatusBadge tone={meta.tone} icon={meta.icon}>{meta.label}</StatusBadge>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
              <span className="font-medium text-foreground">
                {formatNumber(op.from_amount)} {op.from_currency}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="font-medium text-foreground">
                {formatNumber(op.to_amount)} {op.to_currency}
              </span>
            </div>

            <div className="divide-y divide-border rounded-lg border border-border px-3">
              <Row label="Tasa">{formatNumber(op.rate_used)}</Row>
              {op.scenario && op.scenario !== 'NORMAL' ? (
                <Row label="Escenario">
                  <span className="inline-flex items-center gap-1">
                    {op.scenario === 'ZELLE_DIRECT' ? (
                      <Send className="h-3.5 w-3.5" />
                    ) : (
                      <Handshake className="h-3.5 w-3.5" />
                    )}
                    {SCENARIO_LABEL[op.scenario] ?? op.scenario}
                  </span>
                </Row>
              ) : null}
              {op.fund_group_name ? (
                <Row label="Grupo">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {op.fund_group_name}
                  </span>
                </Row>
              ) : null}
              {op.received_by_username ? (
                <Row label="Recibió">
                  <span className="inline-flex items-center gap-1">
                    <Handshake className="h-3.5 w-3.5" />
                    {op.received_by_username}
                  </span>
                </Row>
              ) : null}
              {op.delivery_status ? (
                <Row label="Entrega">
                  {op.delivery_status === 'RECEIVED' ? (
                    <StatusBadge tone="success" icon={PackageCheck}>Entregada</StatusBadge>
                  ) : (
                    <StatusBadge tone="warning" icon={Truck}>Por entregar</StatusBadge>
                  )}
                </Row>
              ) : null}
              {op.notes ? <Row label="Notas">{op.notes}</Row> : null}
              <Row label="Cotizada">{formatDate(op.quoted_at)}</Row>
              {op.completed_at ? <Row label="Completada">{formatDate(op.completed_at)}</Row> : null}
              {op.cancelled_at ? <Row label="Cancelada">{formatDate(op.cancelled_at)}</Row> : null}
              {op.transaction_uuid ? (
                <Row label="Transacción">
                  <Link
                    href={`/admin/transactions/${op.transaction_uuid}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Ver transacción
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Row>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Pagos
              </p>
              {payments && (payments.incoming.length > 0 || payments.outgoing.length > 0) ? (
                <div className="space-y-2">
                  {payments.incoming.map((p) => (
                    <PayRow key={`in-${p.id}`} p={p} incoming />
                  ))}
                  {payments.outgoing.map((p) => (
                    <PayRow key={`out-${p.id}`} p={p} incoming={false} />
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border px-3 py-3 text-center text-xs text-muted-foreground">
                  Sin pagos vinculados a esta operación.
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
