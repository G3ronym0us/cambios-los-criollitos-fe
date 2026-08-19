'use client';

import { useMemo } from 'react';
import { Lock } from 'lucide-react';
import { CurrencyData, CurrencyPairData, CurrencyType } from '@/types/admin';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CurrencyTypeChip } from './CurrencyTypeChip';

/**
 * Monedas que este lado del par NO puede tomar porque el par resultante ya existe.
 *
 * Devuelve `uuid de moneda → nombre del par que la ocupa`, para poder apagar la opción
 * diciendo cuál es ese par, en vez de dejar que el operador guarde y se lo rechace el
 * unique del backend con un error que no explica nada.
 */
export function takenCurrencies(
  pairs: CurrencyPairData[],
  otherCurrencyUuid: string,
  side: 'from' | 'to',
): Map<string, string> {
  const taken = new Map<string, string>();
  if (!otherCurrencyUuid) return taken;
  for (const pair of pairs) {
    if (side === 'from' && pair.to_currency_uuid === otherCurrencyUuid) {
      taken.set(pair.from_currency_uuid, pair.display_name);
    } else if (side === 'to' && pair.from_currency_uuid === otherCurrencyUuid) {
      taken.set(pair.to_currency_uuid, pair.display_name);
    }
  }
  return taken;
}

interface CurrencySelectProps {
  id?: string;
  value: string;
  onChange: (uuid: string) => void;
  currencies: CurrencyData[];
  /** Monedas apagadas y el par que las ocupa (ver `takenCurrencies`). */
  takenBy?: Map<string, string>;
  placeholder?: string;
  /** Marca el campo en rojo sin escribir texto: el motivo va en el pie del formulario. */
  invalid?: boolean;
}

/**
 * El desplegable de moneda, agrupado por tipo.
 *
 * Se agrupa por FIAT/CRYPTO porque el tipo es lo que decide si el par puede ser base, y
 * verlo agrupado ahorra abrir el detalle de cada moneda. Se usa solo: aquí lo consume el
 * campo de par, pero sirve igual para el filtro del listado o para elegir el par base.
 */
export function CurrencySelect({
  id,
  value,
  onChange,
  currencies,
  takenBy,
  placeholder = 'Elegir…',
  invalid = false,
}: CurrencySelectProps) {
  const groups = useMemo(() => {
    const fiat = currencies.filter((c) => c.currency_type === CurrencyType.FIAT);
    const crypto = currencies.filter((c) => c.currency_type === CurrencyType.CRYPTO);
    const rest = currencies.filter(
      (c) => c.currency_type !== CurrencyType.FIAT && c.currency_type !== CurrencyType.CRYPTO,
    );
    return [
      { label: 'FIAT', items: fiat },
      { label: 'CRYPTO', items: crypto },
      { label: 'Sin tipo', items: rest },
    ].filter((group) => group.items.length > 0);
  }, [currencies]);

  const selected = currencies.find((c) => c.uuid === value);

  return (
    <Select value={value || ''} onValueChange={(next) => onChange((next as string) || '')}>
      <SelectTrigger
        id={id}
        aria-invalid={invalid || undefined}
        className="h-10 w-full min-w-0"
      >
        <SelectValue>
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <span className="font-mono text-sm text-foreground">{selected.symbol}</span>
              <span className="truncate text-xs text-muted-foreground">{selected.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {groups.map((group) => (
          <SelectGroup key={group.label}>
            <SelectLabel>{group.label}</SelectLabel>
            {group.items.map((currency) => {
              const takenByPair = takenBy?.get(currency.uuid);
              return (
                <SelectItem
                  key={currency.uuid}
                  value={currency.uuid}
                  disabled={!!takenByPair}
                  className={cn(takenByPair && 'opacity-60')}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="font-mono font-medium text-foreground">{currency.symbol}</span>
                    <span className="truncate text-xs text-muted-foreground">{currency.name}</span>
                    {takenByPair ? (
                      // Decir CUÁL par la ocupa: «no disponible» a secas obliga a ir a
                      // buscarlo al listado para entender por qué.
                      <span className="ml-auto flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                        <Lock className="h-3 w-3" aria-hidden />
                        ya existe{' '}
                        <span className="font-mono text-foreground">{takenByPair}</span>
                      </span>
                    ) : (
                      <CurrencyTypeChip type={currency.currency_type} className="ml-auto" />
                    )}
                  </span>
                </SelectItem>
              );
            })}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
