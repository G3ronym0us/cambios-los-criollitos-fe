'use client';

import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Casilla de selección de listas: un `button` con rol de checkbox y 44 px de blanco táctil
 * alrededor de una casilla de 18. Admite el estado «algunas sí» (`indeterminate`) para la
 * casilla de «todas».
 */
export function SelectCheckbox({
  checked,
  indeterminate,
  disabled,
  label,
  onChange,
  hiddenBelowLg,
}: {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
  /** Oculta en móvil: para listas cuya versión móvil pone la casilla en otro sitio
   *  (p. ej. donde en móvil esa columna la ocupa otro botón). */
  hiddenBelowLg?: boolean;
}) {
  const marked = checked || !!indeterminate;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'h-11 w-11 shrink-0 items-center justify-center rounded-md disabled:cursor-not-allowed',
        hiddenBelowLg ? 'hidden lg:flex' : 'flex',
        !disabled && 'hover:bg-muted',
      )}
    >
      <span
        className={cn(
          'flex h-[18px] w-[18px] items-center justify-center rounded border-2 transition-colors',
          disabled
            ? 'border-border bg-muted'
            : marked
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground/40 bg-card',
        )}
      >
        {indeterminate ? (
          <Minus className="h-3 w-3" strokeWidth={3.5} />
        ) : checked ? (
          <Check className="h-3 w-3" strokeWidth={3.5} />
        ) : null}
      </span>
    </button>
  );
}
