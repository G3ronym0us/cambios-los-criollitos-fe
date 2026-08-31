'use client';

import Link from 'next/link';
import { ArrowRight, Handshake, Send, Users } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { getStatusMeta } from '@/utils/operationStatus';
import { formatCaracasDateTime } from '@/utils/functions';
import type { OperationData, OperationScenario } from '@/types/operation';
import { getCoverage, rateDeviation, timeUntil } from '../_lib/operationCoverage';

/** Mismo track en la cabecera y en cada fila para que las columnas cuadren. */
export const OPERATION_GRID =
  'grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 lg:grid-cols-[minmax(0,1fr)_14rem_5.5rem_9rem_7rem_5rem] lg:gap-y-0';

interface OperationRowProps {
  operation: OperationData;
}

function scenarioChip(scenario: OperationScenario) {
  switch (scenario) {
    case 'ZELLE_DIRECT':
      return { label: 'Zelle', icon: Send };
    case 'VIA_PARTNER':
      return { label: 'socio', icon: Handshake };
    default:
      return null;
  }
}

function amount(n: number | null | undefined) {
  if (n == null) return '—';
  return n.toLocaleString('es-VE', { maximumFractionDigits: 2 });
}

/** El tono de la cobertura, que es lo único de la fila que sí grita. */
const COVERAGE_TONE: Record<string, string> = {
  neutral: 'text-muted-foreground',
  warning: 'text-amber-700 dark:text-amber-400',
  destructive: 'text-destructive',
  success: 'text-emerald-700 dark:text-emerald-400',
};

export function OperationRow({ operation: op }: OperationRowProps) {
  const meta = getStatusMeta(op.status);
  const chip = scenarioChip(op.scenario ?? 'NORMAL');
  const coverage = getCoverage(op);
  const deviation = rateDeviation(op);
  const client =
    op.client_display_name || op.client_phone?.replace(/@(c|g)\.us$/, '') || 'Sin cliente asignado';
  const phone = op.client_phone?.replace(/@(c|g)\.us$/, '') ?? null;

  return (
    <Link
      href={`/admin/operations/${op.uuid}`}
      aria-label={`Ver detalle de la operación de ${client}`}
      className={cn(
        OPERATION_GRID,
        'items-center border-t border-border px-3 py-3 transition-colors first:border-t-0 hover:bg-muted/40 lg:min-h-[4rem] lg:py-2',
        // Solo lo que pide acción lleva barra; lo normal no grita.
        coverage.tone === 'destructive' && 'shadow-[inset_3px_0_0_var(--color-destructive)]',
        coverage.tone === 'warning' && 'shadow-[inset_3px_0_0_var(--color-amber-500)]',
        op.status === 'CANCELLED' && 'opacity-55',
      )}
    >
      {/* Cliente */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'truncate text-sm font-semibold',
              op.client_display_name ? 'text-foreground' : 'text-muted-foreground italic',
            )}
          >
            {client}
          </span>
          {chip ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold text-muted-foreground">
              <chip.icon className="h-3 w-3" aria-hidden />
              {chip.label}
            </span>
          ) : null}
          {!op.client_uuid ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold text-muted-foreground">
              <Users className="h-3 w-3" aria-hidden />
              de grupo
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {[phone, op.fund_group_name ? `fondo ${op.fund_group_name}` : null]
            .filter(Boolean)
            .join(' · ') || 'sin fondo'}
        </p>
      </div>

      {/* Estado — en móvil sube junto al nombre; en escritorio va en su columna */}
      <div className="row-start-1 flex justify-end lg:order-none lg:col-start-5 lg:justify-start">
        <StatusBadge tone={meta.tone} icon={meta.icon}>
          {meta.label}
        </StatusBadge>
      </div>

      {/* El cambio, en un solo renglón */}
      <div className="col-span-2 min-w-0 lg:col-span-1 lg:col-start-2">
        <p className="flex flex-wrap items-center gap-1.5 text-sm text-foreground">
          <span className="font-semibold tabular-nums">
            {amount(op.from_amount)} <span className="text-xs font-normal">{op.from_currency}</span>
          </span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="font-semibold tabular-nums">
            {amount(op.to_amount)} <span className="text-xs font-normal">{op.to_currency}</span>
          </span>
        </p>
        <p className="truncate text-xs text-muted-foreground">{op.pair_symbol ?? '—'}</p>
      </div>

      {/* Tasa cotizada, y la real si los comprobantes ya la movieron */}
      <div className="min-w-0 lg:col-start-3">
        <span className="text-xs text-muted-foreground lg:hidden">Tasa: </span>
        <span className="text-sm font-semibold text-foreground tabular-nums">
          {amount(op.rate_used)}
        </span>
        <p
          className={cn(
            'text-xs',
            deviation != null && Math.abs(deviation) >= 0.5
              ? 'text-amber-700 dark:text-amber-400'
              : 'text-muted-foreground',
          )}
        >
          {op.real_rate ? `real ${amount(op.real_rate)}` : 'cotizada'}
        </p>
      </div>

      {/* Cobertura — la lectura que decide si hoy tocas esta fila */}
      <div className="min-w-0 lg:col-start-4">
        <p className={cn('truncate text-xs font-medium', COVERAGE_TONE[coverage.tone])}>
          {coverage.label}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {op.status === 'QUOTED' ? (timeUntil(op.expires_at) ?? coverage.detail) : coverage.detail}
        </p>
      </div>

      {/* Creada */}
      <div className="hidden text-xs text-muted-foreground lg:col-start-6 lg:block">
        {formatCaracasDateTime(op.created_at)}
      </div>
    </Link>
  );
}
