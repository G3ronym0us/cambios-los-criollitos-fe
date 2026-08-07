'use client';

import { Controller } from 'react-hook-form';
import { Bitcoin, Eye, Info, ToggleRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { CurrencyType, PairType, type DerivedPairData } from '@/types/admin';
import { normalizePairType } from '../../_lib/pairHealth';
import type { SectionProps } from './formShared';

interface StatusSectionProps extends SectionProps {
  fromType: CurrencyType;
  toType: CurrencyType;
  /** Pares que toman su tasa de este: apagarlo los arrastra. */
  derivedPairs: DerivedPairData[];
}

interface ToggleRowProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
  icon: React.ReactNode;
  /** Motivo por el que no se puede tocar; el switch queda inerte en vez de fallar. */
  disabledReason?: string;
}

function ToggleRow({
  checked,
  onChange,
  label,
  description,
  icon,
  disabledReason,
}: ToggleRowProps) {
  const disabled = !!disabledReason;
  return (
    <label
      className={cn(
        'flex min-h-12 items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 transition-colors',
        disabled ? 'cursor-default' : 'cursor-pointer hover:bg-muted/40'
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted',
            disabled ? 'text-muted-foreground/60' : 'text-muted-foreground'
          )}
          aria-hidden
        >
          {icon}
        </span>
        <span className="min-w-0">
          <span
            className={cn(
              'block text-sm font-medium',
              disabled ? 'text-muted-foreground' : 'text-foreground'
            )}
          >
            {label}
          </span>
          <span className="block text-xs text-muted-foreground">
            {disabledReason ?? description}
          </span>
        </span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </label>
  );
}

/**
 * Activo / Monitor / Binance. Son ajustes de montaje —se tocan una vez, al
 * crear el par—, así que viven aquí y no en el listado, donde 3 switches por
 * fila se apagaban sin querer al hacer scroll en el teléfono.
 */
export function StatusSection({
  control,
  watch,
  fromType,
  toType,
  derivedPairs,
}: StatusSectionProps) {
  const isActive = watch('is_active');
  const pairType = normalizePairType(watch('pair_type') ?? PairType.BASE);

  // Binance solo sabe cotizar FIAT contra CRYPTO; el resto toma la tasa de otro par.
  const isFiatCrypto =
    (fromType === CurrencyType.FIAT && toType === CurrencyType.CRYPTO) ||
    (fromType === CurrencyType.CRYPTO && toType === CurrencyType.FIAT);

  const binanceDisabledReason = !isFiatCrypto
    ? 'No aplica: este par no es FIAT-CRYPTO, su tasa viene de otro par'
    : pairType === PairType.DERIVED
      ? 'No aplica: es un par derivado, la tasa la pone su base'
      : undefined;

  return (
    <div className="space-y-2.5 border-t border-border pt-4">
      <div>
        <p className="text-sm font-medium">Estado del par</p>
        <p className="text-xs text-muted-foreground">
          Se cambia aquí, no en el listado: son ajustes de montaje, no de trabajo diario.
        </p>
      </div>

      <Controller
        name="is_active"
        control={control}
        render={({ field }) => (
          <ToggleRow
            checked={field.value ?? true}
            onChange={field.onChange}
            label="Activo"
            description="Visible para clientes y cotizable"
            icon={<ToggleRight className="h-4 w-4" />}
          />
        )}
      />

      <Controller
        name="is_monitored"
        control={control}
        render={({ field }) => (
          <ToggleRow
            checked={field.value ?? true}
            onChange={field.onChange}
            label="Monitor"
            description="El bot relee la tasa en cada corrida"
            icon={<Eye className="h-4 w-4" />}
          />
        )}
      />

      <Controller
        name="binance_tracked"
        control={control}
        render={({ field }) => (
          <ToggleRow
            checked={field.value ?? false}
            onChange={field.onChange}
            label="Binance P2P"
            description="La tasa se lee directo del P2P de Binance"
            icon={<Bitcoin className="h-4 w-4" />}
            disabledReason={binanceDisabledReason}
          />
        )}
      />

      {!isActive && derivedPairs.length > 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            Al apagar <strong className="font-semibold">Activo</strong>, estos pares se quedan sin
            tasa porque derivan de este:{' '}
            <span className="font-mono">
              {derivedPairs.map((p) => p.display_name).join(', ')}
            </span>
            .
          </span>
        </div>
      ) : !isActive ? (
        <div className="flex items-start gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            Al apagar <strong className="font-semibold text-foreground">Activo</strong> este par deja
            de cotizar y sale de la calculadora del cliente. No arrastra a nadie: nada cuelga de él.
          </span>
        </div>
      ) : null}
    </div>
  );
}
