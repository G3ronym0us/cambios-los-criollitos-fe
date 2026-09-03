'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

type Tone = 'warning' | 'destructive' | 'neutral' | 'success';

const toneStyles: Record<Tone, { icon: string; value: string; ring: string }> = {
  warning: {
    icon: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    value: 'text-amber-700 dark:text-amber-400',
    ring: 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10',
  },
  destructive: {
    icon: 'bg-destructive/15 text-destructive',
    value: 'text-destructive',
    ring: 'border-destructive/30 bg-destructive/5 hover:bg-destructive/10',
  },
  neutral: {
    icon: 'bg-muted text-muted-foreground',
    value: 'text-foreground',
    ring: 'border-border bg-card hover:bg-muted/50',
  },
  success: {
    icon: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    value: 'text-emerald-700 dark:text-emerald-400',
    ring: 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10',
  },
};

interface OverviewLinkCardProps {
  href: string;
  icon: LucideIcon;
  value: string;
  label: string;
  /** Hasta dos renglones de detalle, como en el diseño ("5 sin vincular · ..."). */
  detailLines?: (string | null)[];
  /** "Pagos · por atender" — visible en escritorio; en móvil lo reemplaza el chevron. */
  footerCaption?: string;
  tone?: Tone;
  className?: string;
}

/**
 * Una cifra, un enlace. Toda la tarjeta es el área de toque (≥44px) — la home no abre
 * cajones, así que no hay botón aparte: tocar en cualquier punto lleva a la bandeja ya
 * filtrada.
 */
export function OverviewLinkCard({
  href,
  icon: Icon,
  value,
  label,
  detailLines = [],
  footerCaption,
  tone = 'neutral',
  className,
}: OverviewLinkCardProps) {
  const t = toneStyles[tone];
  const lines = detailLines.filter((l): l is string => Boolean(l));

  return (
    <Link
      href={href}
      className={cn(
        'flex min-h-[96px] flex-col gap-2 rounded-xl border p-4 text-left transition-colors',
        t.ring,
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', t.icon)}>
          <Icon className="h-4 w-4" />
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground sm:hidden" aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <span className="flex items-baseline gap-1.5">
          <span className={cn('text-2xl font-bold tabular-nums', t.value)}>{value}</span>
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </span>
        {lines.map((line, i) => (
          <p key={i} className="mt-0.5 truncate text-xs text-muted-foreground">
            {line}
          </p>
        ))}
      </div>

      {footerCaption ? (
        <p className="hidden text-xs font-medium text-primary sm:block">{footerCaption} →</p>
      ) : null}
    </Link>
  );
}

/** Mismo tamaño de sitio que la tarjeta real: el esqueleto no colapsa el layout. */
export function OverviewLinkCardSkeleton() {
  return (
    <div className="flex min-h-[96px] flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <Skeleton className="h-9 w-9 rounded-lg" />
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}
