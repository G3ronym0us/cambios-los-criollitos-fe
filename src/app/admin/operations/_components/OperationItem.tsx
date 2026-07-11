'use client';

import Link from 'next/link';
import {
  ArrowRight,
  ChevronRight,
  Handshake,
  PackageCheck,
  PiggyBank,
  Send,
  Truck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getStatusMeta } from '@/utils/operationStatus';
import { formatCaracasDateTime } from '@/utils/functions';
import type { OperationData, OperationScenario } from '@/types/operation';

interface OperationItemProps {
  operation: OperationData;
}

type ScenarioMeta = { label: string; tone: 'neutral' | 'primary' | 'info'; icon: LucideIcon };

function getScenarioMeta(scenario: OperationScenario): ScenarioMeta | null {
  switch (scenario) {
    case 'ZELLE_DIRECT':
      return { label: 'Zelle directo', tone: 'primary', icon: Send };
    case 'VIA_PARTNER':
      return { label: 'Vía socio', tone: 'info', icon: Handshake };
    case 'NORMAL':
    default:
      return null;
  }
}

function formatAmount(n: number) {
  return n.toLocaleString('es-VE', { maximumFractionDigits: 2 });
}

function formatDate(value: string | null) {
  if (!value) return null;
  return formatCaracasDateTime(value);
}

export function OperationItem({ operation: op }: OperationItemProps) {
  const meta = getStatusMeta(op.status);
  const scenarioMeta = getScenarioMeta(op.scenario ?? 'NORMAL');
  const client = op.client_display_name || op.client_phone?.replace(/@(c|g)\.us$/, '') || 'Cliente';
  const pair = op.pair_symbol || `${op.from_currency ?? '?'}-${op.to_currency ?? '?'}`;
  const created = formatDate(op.created_at);

  return (
    <Link
      href={`/admin/operations/${op.uuid}`}
      aria-label={`Ver detalle de la operación de ${client}`}
      className="group block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card className="h-full transition-colors group-hover:bg-muted/30 group-active:bg-muted/50">
        <CardContent className="space-y-3 p-4 sm:p-5">
          <header className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-foreground">{client}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{pair}</p>
            </div>
            <div className="flex shrink-0 items-start gap-1.5">
              <div className="flex max-w-48 flex-wrap justify-end gap-1.5">
                {scenarioMeta ? (
                  <StatusBadge tone={scenarioMeta.tone} icon={scenarioMeta.icon}>
                    {scenarioMeta.label}
                  </StatusBadge>
                ) : null}
                <StatusBadge tone={meta.tone} icon={meta.icon}>
                  {meta.label}
                </StatusBadge>
              </div>
              <ChevronRight className="mt-0.5 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
          </header>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
            <span className="font-medium text-foreground">
              {formatAmount(op.from_amount)} {op.from_currency}
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="font-medium text-foreground">
              {formatAmount(op.to_amount)} {op.to_currency}
            </span>
          </div>

          {op.fund_group_name || op.received_by_username ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {op.fund_group_name ? (
                <span className="inline-flex items-center gap-1">
                  <PiggyBank className="h-3.5 w-3.5" />
                  {op.transaction_uuid ? 'Fondo aplicado' : 'Fondo asignado'}: {op.fund_group_name}
                </span>
              ) : null}
              {op.received_by_username ? (
                <span className="inline-flex items-center gap-1">
                  <Handshake className="h-3.5 w-3.5" />
                  Recibió: {op.received_by_username}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Tasa: {formatAmount(op.rate_used)}</span>
            <div className="flex items-center gap-2">
              {op.delivery_status === 'RECEIVED' ? (
                <StatusBadge tone="success" icon={PackageCheck}>Entregada</StatusBadge>
              ) : op.delivery_status === 'PENDING' ? (
                <StatusBadge tone="warning" icon={Truck}>Por entregar</StatusBadge>
              ) : null}
              {created ? <span>{created}</span> : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
