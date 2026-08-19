'use client';

import { useMemo } from 'react';
import { ArrowRight, ArrowLeftRight, CircleAlert, Info } from 'lucide-react';
import { CurrencyData, CurrencyPairData, CurrencyType, PairType } from '@/types/admin';
import { Label } from '@/components/ui/label';
import { takenCurrencies } from '../_lib/newPairForm';
import { CurrencySelect } from './CurrencySelect';

interface CurrencyPairFieldProps {
  currencies: CurrencyData[];
  /** Todos los pares que ya existen: apagan las combinaciones duplicadas. */
  existingPairs: CurrencyPairData[];
  fromUuid: string;
  toUuid: string;
  onChange: (next: { from: string; to: string }) => void;
  /** El orden FIAT → CRYPTO solo se exige en los pares base (son los que lee Binance). */
  pairType: PairType;
}

/**
 * Las dos monedas del par como una sola pieza: origen, flecha y destino.
 *
 * Van juntas y no apiladas porque lo que se está eligiendo es una dirección, no dos datos
 * sueltos — «BRL → USDT» se lee de un vistazo, «Moneda de origen» encima de «Moneda de
 * destino» hay que reconstruirlo. La pieza valida el orden y ofrece invertirlo en vez de
 * limitarse a rechazarlo.
 */
export function CurrencyPairField({
  currencies,
  existingPairs,
  fromUuid,
  toUuid,
  onChange,
  pairType,
}: CurrencyPairFieldProps) {
  const takenForFrom = useMemo(
    () => takenCurrencies(existingPairs, toUuid, 'from'),
    [existingPairs, toUuid],
  );
  const takenForTo = useMemo(
    () => takenCurrencies(existingPairs, fromUuid, 'to'),
    [existingPairs, fromUuid],
  );

  const from = currencies.find((c) => c.uuid === fromUuid);
  const to = currencies.find((c) => c.uuid === toUuid);

  const swap = () => onChange({ from: toUuid, to: fromUuid });

  // La misma moneda a los dos lados es una paridad 1:1, y es deliberada: es lo que hace
  // falta para colgar de ella un par de método de pago (ZELLE-USDT = USDT-USDT −7 %). Antes
  // se rechazaba de plano, lo que dejaba esa configuración sin forma de crearse desde el
  // panel. Se permite, pero se dice qué es para que nadie la cree sin querer.
  const parity = !!fromUuid && fromUuid === toUuid;

  // Un par base es lo que Binance cotiza: FIAT contra CRYPTO. Al revés se guarda igual,
  // pero es casi siempre un descuido, así que se dice antes de guardar y con el arreglo
  // a un clic.
  const reversedBase =
    !parity &&
    pairType === PairType.BASE &&
    from?.currency_type === CurrencyType.CRYPTO &&
    to?.currency_type === CurrencyType.FIAT;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="pair-from">
            Origen <span className="text-destructive">*</span>
          </Label>
          <CurrencySelect
            id="pair-from"
            value={fromUuid}
            onChange={(uuid) => onChange({ from: uuid, to: toUuid })}
            currencies={currencies}
            takenBy={takenForFrom}
          />
        </div>

        {/* Invertir es la acción, la flecha es el estado: el mismo control dice hacia dónde
            va el par y permite darle la vuelta sin volver a elegir las dos monedas. */}
        <button
          type="button"
          onClick={swap}
          disabled={!fromUuid && !toUuid}
          title="Invertir origen y destino"
          aria-label="Invertir origen y destino"
          className="group/swap flex h-10 w-10 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <ArrowRight className="h-4 w-4 group-hover/swap:hidden" aria-hidden />
          <ArrowLeftRight className="hidden h-4 w-4 group-hover/swap:block" aria-hidden />
        </button>

        <div className="space-y-1.5">
          <Label htmlFor="pair-to">
            Destino <span className="text-destructive">*</span>
          </Label>
          <CurrencySelect
            id="pair-to"
            value={toUuid}
            onChange={(uuid) => onChange({ from: fromUuid, to: uuid })}
            currencies={currencies}
            takenBy={takenForTo}
          />
        </div>
      </div>

      {parity && from ? (
        <div className="flex items-start gap-2 rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-xs text-sky-700 dark:text-sky-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <p className="text-pretty">
            Las dos monedas son la misma: esto crea una{' '}
            <span className="font-semibold">paridad 1:1</span>{' '}
            <span className="font-mono">
              {from.symbol}/{from.symbol}
            </span>
            . No se cotiza — sirve de base para colgarle pares con un porcentaje.
          </p>
        </div>
      ) : null}

      {reversedBase && from && to ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <p className="text-pretty">
            Un par base se lee <span className="font-mono">FIAT/CRYPTO</span>. Así como está
            sería{' '}
            <span className="font-mono font-semibold">
              {from.symbol}/{to.symbol}
            </span>{' '}
            —{' '}
            <button
              type="button"
              onClick={swap}
              className="font-semibold underline underline-offset-2 hover:no-underline"
            >
              invertir a{' '}
              <span className="font-mono">
                {to.symbol}/{from.symbol}
              </span>
            </button>
            .
          </p>
        </div>
      ) : null}
    </div>
  );
}
