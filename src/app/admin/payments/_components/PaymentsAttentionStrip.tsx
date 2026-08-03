'use client';

import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/functions';
import type { AttentionFilter, PaymentStats } from '@/types/payment';

interface PaymentsAttentionStripProps {
  stats: PaymentStats | null;
  attention: AttentionFilter;
  onAttentionChange: (value: AttentionFilter) => void;
  outgoing: boolean;
}

interface TileProps {
  value: string;
  label: string;
  hint: string;
  emphasis?: boolean;
  active?: boolean;
  onClick?: () => void;
}

function Tile({ value, label, hint, emphasis, active, onClick }: TileProps) {
  const content = (
    <>
      <span
        className={cn(
          'text-lg font-bold tabular-nums',
          emphasis ? 'text-amber-700 dark:text-amber-400' : 'text-foreground',
        )}
      >
        {value}
      </span>
      <span className="min-w-0 text-left text-xs leading-tight">
        <span className={cn('block', emphasis ? 'text-amber-700 dark:text-amber-400' : 'text-foreground')}>
          {label}
        </span>
        <span className="block text-muted-foreground">{hint}</span>
      </span>
    </>
  );

  const className = cn(
    'flex min-h-11 items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors',
    emphasis ? 'border-amber-500/40 bg-amber-500/10' : 'border-border bg-card',
    onClick && 'cursor-pointer hover:bg-muted/60',
    active && 'ring-2 ring-primary/50',
  );

  if (!onClick) return <div className={className}>{content}</div>;
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={className}>
      {content}
    </button>
  );
}

/**
 * Lo que hay que atender, arriba del todo: cuántos comprobantes esperan decisión, cuánto
 * dinero de ellos no respalda nada, y el ritmo del día. La primera tarjeta es además el
 * acceso al filtro — la cifra y el filtro que la aísla son lo mismo, así que se pulsan juntos.
 */
export function PaymentsAttentionStrip({
  stats,
  attention,
  onAttentionChange,
  outgoing,
}: PaymentsAttentionStripProps) {
  if (!stats || (stats.needs_attention === 0 && stats.received_today === 0)) return null;

  const top = stats.unassigned[0] ?? null;
  const others = stats.unassigned.length - 1;
  const filtering = attention === 'ATTENTION';

  return (
    <div className="flex flex-wrap gap-2.5">
      <Tile
        value={String(stats.needs_attention)}
        label="por atender"
        hint={outgoing ? 'sin clasificar ni vincular' : 'sin vincular o incompletos'}
        emphasis={stats.needs_attention > 0}
        active={filtering}
        onClick={
          stats.needs_attention > 0
            ? () => onAttentionChange(filtering ? 'ALL' : 'ATTENTION')
            : undefined
        }
      />

      {top ? (
        <Tile
          value={formatNumber(top.amount)}
          label={`${top.currency} sin asignar`}
          hint={
            others > 0
              ? `en ${top.count} comprobantes · y ${others} moneda${others > 1 ? 's' : ''} más`
              : `en ${top.count} comprobante${top.count === 1 ? '' : 's'}${
                  stats.unassigned_truncated ? ' o más' : ''
                }`
          }
        />
      ) : null}

      <Tile
        value={String(stats.received_today)}
        label="recibidos hoy"
        hint={`${stats.reconciled_today} ya conciliados`}
      />
    </div>
  );
}
