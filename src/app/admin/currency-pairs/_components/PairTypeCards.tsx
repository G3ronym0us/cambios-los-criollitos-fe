'use client';

import { PairType } from '@/types/admin';
import { cn } from '@/lib/utils';

/**
 * El tipo de par decide toda la pantalla (de dónde sale la tasa, qué campos aparecen
 * después), así que se elige entre tarjetas con la explicación a la vista y no dentro de un
 * select que hay que abrir para saber qué significa cada opción.
 *
 * Dos disposiciones para el mismo control: apilada al crear —donde el operador quizá no
 * sabe todavía cuál necesita y el texto largo es el que decide— y en rejilla al editar,
 * donde ya eligió y solo hace falta ver cuál está puesto.
 */

interface PairTypeOption {
  value: PairType;
  label: string;
  /** Frase larga: la que se lee al crear, cuando la decisión aún no está tomada. */
  hint: string;
  /** Frase corta para la rejilla del detalle. */
  shortHint: string;
}

const PAIR_TYPE_OPTIONS: PairTypeOption[] = [
  {
    value: PairType.BASE,
    label: 'Base',
    hint: 'Se lee directo de Binance P2P. Necesita una FIAT y una CRYPTO.',
    shortHint: 'Directo de Binance P2P (FIAT-CRYPTO)',
  },
  {
    value: PairType.DERIVED,
    label: 'Derivado',
    hint: 'Toma la tasa de un par base y le aplica un porcentaje.',
    shortHint: 'De un par base, con porcentaje',
  },
  {
    value: PairType.CROSS,
    label: 'Cruzado',
    hint: 'Entre dos FIAT, multiplicando por USDT. Se configura después.',
    shortHint: 'Entre dos FIAT vía USDT',
  },
];

export function PairTypeCards({
  value,
  onChange,
  layout = 'grid',
}: {
  value: PairType;
  onChange: (value: PairType) => void;
  layout?: 'grid' | 'stack';
}) {
  const stacked = layout === 'stack';
  return (
    <div
      role="radiogroup"
      aria-label="Tipo de par"
      className={cn('grid gap-2', stacked ? 'grid-cols-1' : 'sm:grid-cols-3')}
    >
      {PAIR_TYPE_OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex gap-2.5 rounded-lg border p-3 text-left transition-colors',
              selected
                ? 'border-primary bg-primary/5 ring-3 ring-primary/10'
                : 'border-border bg-card hover:bg-muted/40',
            )}
          >
            {/* El punto de selección: sin él las tarjetas se leen como botones que hacen
                algo, y no como «elige una de las tres». */}
            <span
              aria-hidden
              className={cn(
                'mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2',
                selected ? 'border-[4px] border-primary' : 'border-border',
              )}
            />
            <span className="min-w-0">
              <span
                className={cn(
                  'block text-sm font-semibold',
                  selected ? 'text-primary' : 'text-foreground',
                )}
              >
                {option.label}
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-muted-foreground text-pretty">
                {stacked ? option.hint : option.shortHint}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
