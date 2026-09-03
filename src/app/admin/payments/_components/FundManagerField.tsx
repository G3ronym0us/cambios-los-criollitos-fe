'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { avatarClass } from '@/app/admin/funds/_lib/format';
import { cn } from '@/lib/utils';
import type { FundGroup } from '@/types/fund';
import {
  fundBadge,
  isFundFromPayment,
  isManagerOverridden,
  matchesPairCurrency,
} from '../_lib/fundManagerField';

function FieldLabel() {
  return (
    <span className="text-xs font-medium text-muted-foreground">
      Fondo y gestor <span className="text-muted-foreground/70">· opcional, solo si la operación entrega</span>
    </span>
  );
}

interface FundManagerFieldProps {
  /** Sin par elegido no hay con qué moneda ordenar los fondos: el campo se queda inerte. */
  pairSelected: boolean;
  /** Fondos que el par sugiere (ver `splitFundOptions`). Solo para redactar el campo. */
  suggested: FundGroup[];
  /** El resto de los fondos activos: hay algo que elegir aunque el par no sugiera nada. */
  others: FundGroup[];
  selectedGroup: FundGroup | undefined;
  selectedManagerUuid: string;
  fromCur: string;
  toCur: string;
  paymentFundGroupUuid: string | null | undefined;
  /** Abre el paso de elegir fondo dentro del cajón (`FundStep`). */
  onOpenStep: () => void;
}

/**
 * Campo cerrado de «Fondo y gestor», de altura fija: el pie del cajón no se mueve al elegir.
 * Un solo control para las dos decisiones — el gestor es su segunda línea, no un campo aparte
 * que nace cuando se elige fondo (el salto de ~66 px que tenía el formulario con dos
 * `<Select>`). Reemplaza a esos dos selects; el paso que abre es `FundStep`.
 *
 * «Cambiar» SIEMPRE abre ese paso. Antes, con un único fondo sugerido, se ahorraba el paso y
 * alternaba entre ese fondo y «sin fondo»: el botón no cambiaba nada, solo quitaba y ponía el
 * mismo. Elegir es elegir de una lista, y esa lista incluye los fondos que el par no sugiere.
 */
export function FundManagerField({
  pairSelected,
  suggested,
  others,
  selectedGroup,
  selectedManagerUuid,
  fromCur,
  toCur,
  paymentFundGroupUuid,
  onOpenStep,
}: FundManagerFieldProps) {
  if (!pairSelected) {
    return (
      <div className="space-y-1.5">
        <FieldLabel />
        <div className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
          <span className="text-sm text-muted-foreground">Elige el par primero</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
        </div>
      </div>
    );
  }

  if (suggested.length === 0 && others.length === 0) {
    return (
      <div className="space-y-1.5">
        <FieldLabel />
        <div className="flex min-h-[60px] items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-3 py-2">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm text-foreground">No hay ningún fondo activo</span>
            <span className="text-xs text-muted-foreground">la operación se crea sin fondo</span>
          </span>
          <Link
            href="/admin/funds"
            target="_blank"
            className="shrink-0 text-xs font-semibold text-primary hover:underline"
          >
            Crear fondo
          </Link>
        </div>
      </div>
    );
  }

  const manager = selectedGroup?.members?.find((m) => m.user_uuid === selectedManagerUuid);
  const overridden = isManagerOverridden(selectedGroup, selectedManagerUuid);
  const mismatched = selectedGroup ? !matchesPairCurrency(selectedGroup, fromCur, toCur) : false;
  const fromPayment = selectedGroup ? isFundFromPayment(selectedGroup.uuid, paymentFundGroupUuid) : false;
  const highlighted = overridden || (mismatched && fromPayment);

  return (
    <div className="space-y-1.5">
      <FieldLabel />
      <button
        type="button"
        onClick={onOpenStep}
        className={cn(
          'flex min-h-[60px] w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors',
          highlighted
            ? 'border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10'
            : 'border-border bg-card hover:bg-muted/30',
        )}
      >
        {selectedGroup ? (
          <>
            <span
              className={cn(
                'flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg text-[11px] font-bold',
                avatarClass(selectedGroup.uuid),
              )}
            >
              {fundBadge(selectedGroup.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">
                {selectedGroup.name}
                {selectedGroup.currency ? (
                  <span className="font-medium text-muted-foreground"> · {selectedGroup.currency}</span>
                ) : null}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {overridden && manager ? (
                  <>
                    Lo movió <span className="font-medium text-foreground/80">{manager.username || manager.user_uuid}</span>, no el gestor del fondo
                  </>
                ) : mismatched ? (
                  `No es de ${fromCur} ni ${toCur}, pero el comprobante ya se contó ahí`
                ) : manager ? (
                  <>
                    Gestiona <span className="font-medium text-foreground/80">{manager.username || manager.user_uuid}</span>
                  </>
                ) : (
                  'sin gestor asignado'
                )}
              </span>
            </span>
          </>
        ) : (
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-muted-foreground">Sin fondo</span>
            <span className="block text-xs text-muted-foreground/80">
              {suggested.length === 0
                ? `ningún fondo liquida en ${fromCur} ni ${toCur}, pero puedes elegir otro`
                : 'no se descuenta de ningún saldo'}
            </span>
          </span>
        )}
        <span className="shrink-0 text-xs font-semibold text-primary">Cambiar</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>
    </div>
  );
}
