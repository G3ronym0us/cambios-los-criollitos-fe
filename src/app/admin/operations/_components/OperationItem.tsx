'use client';

import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Handshake,
  PackageCheck,
  Pencil,
  Send,
  Truck,
  Users,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { OperationData, OperationScenario, OperationStatus } from '@/types/operation';

interface OperationItemProps {
  operation: OperationData;
  onEdit?: (operation: OperationData) => void;
}

type StatusMeta = { label: string; tone: 'info' | 'warning' | 'success' | 'destructive'; icon: LucideIcon };

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

function getStatusMeta(status: OperationStatus): StatusMeta {
  switch (status) {
    case 'QUOTED':
      return { label: 'Cotizada', tone: 'info', icon: FileText };
    case 'PENDING':
      return { label: 'Pendiente', tone: 'warning', icon: Clock };
    case 'COMPLETED':
      return { label: 'Completada', tone: 'success', icon: CheckCircle2 };
    case 'CANCELLED':
      return { label: 'Cancelada', tone: 'destructive', icon: XCircle };
  }
}

function formatAmount(n: number) {
  return n.toLocaleString('es-VE', { maximumFractionDigits: 2 });
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

export function OperationItem({ operation: op, onEdit }: OperationItemProps) {
  const meta = getStatusMeta(op.status);
  const scenarioMeta = getScenarioMeta(op.scenario ?? 'NORMAL');
  const client = op.client_display_name || op.client_phone?.replace(/@(c|g)\.us$/, '') || 'Cliente';
  const pair = op.pair_symbol || `${op.from_currency ?? '?'}-${op.to_currency ?? '?'}`;
  const created = formatDate(op.created_at);

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 p-4 sm:p-5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-foreground">{client}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{pair}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {scenarioMeta ? (
              <StatusBadge tone={scenarioMeta.tone} icon={scenarioMeta.icon}>
                {scenarioMeta.label}
              </StatusBadge>
            ) : null}
            <StatusBadge tone={meta.tone} icon={meta.icon}>
              {meta.label}
            </StatusBadge>
            {onEdit ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(op)}
                aria-label="Editar escenario"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            ) : null}
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
                <Users className="h-3.5 w-3.5" />
                {op.fund_group_name}
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
  );
}
