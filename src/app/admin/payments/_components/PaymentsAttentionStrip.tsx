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

interface MiniStatProps {
  value: string;
  label: string;
  emphasis?: boolean;
  active?: boolean;
  onClick?: () => void;
}

/**
 * Versión de bolsillo de `Tile` para móvil: en 375 px no caben cuatro tarjetas con su
 * pista secundaria (el diseño lo deja claro — ahí solo van dos cifras lado a lado), así
 * que esto es solo número + etiqueta. La primera sigue siendo el filtro de "por atender",
 * igual que en escritorio.
 */
function MiniStat({ value, label, emphasis, active, onClick }: MiniStatProps) {
  const content = (
    <>
      <span
        className={cn(
          'text-sm font-bold tabular-nums',
          emphasis ? 'text-amber-700 dark:text-amber-400' : 'text-foreground',
        )}
      >
        {value}
      </span>
      <span
        className={cn(
          'text-[10.5px] leading-none',
          emphasis ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
    </>
  );

  const className = cn(
    'flex min-h-11 flex-1 flex-col items-start justify-center gap-0.5 rounded-lg px-2.5 py-1.5 text-left transition-colors',
    emphasis ? 'bg-amber-500/10' : 'bg-muted',
    onClick && 'cursor-pointer',
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
 *
 * El diseño solo le da sitio a esto en escritorio: en móvil (bajo `lg`, mismo corte que usa
 * el resto de la bandeja) lo reemplaza una línea compacta de dos datos — por atender y
 * conciliados — porque cuatro tarjetas con pista secundaria no caben en 375 px sin empujar
 * el resto de la pantalla fuera de vista.
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
    <>
      <div className="hidden flex-wrap gap-2.5 lg:flex">
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

      <div className="flex gap-1.5 lg:hidden">
        <MiniStat
          value={String(stats.needs_attention)}
          label="por atender"
          emphasis={stats.needs_attention > 0}
          active={filtering}
          onClick={
            stats.needs_attention > 0
              ? () => onAttentionChange(filtering ? 'ALL' : 'ATTENTION')
              : undefined
          }
        />
        <MiniStat value={String(stats.reconciled_today)} label="conciliados" />
      </div>
    </>
  );
}
