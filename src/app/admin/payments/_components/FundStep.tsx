'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { SidePanelBody, SidePanelFooter } from '@/components/shared/SidePanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { avatarClass } from '@/app/admin/funds/_lib/format';
import { cn } from '@/lib/utils';
import type { FundGroup } from '@/types/fund';
import {
  defaultManagerFor,
  filterFundCandidates,
  fundBadge,
  isFundFromPayment,
  personInitials,
} from '../_lib/fundManagerField';

/** Valor interno para «sin fondo»: el radio no admite un value vacío como opción real. */
const NONE = '__sin_fondo__';

interface FundStepProps {
  /** Los que el par sugiere. Van arriba, ya ordenados (el del pago primero). */
  suggested: FundGroup[];
  /** El resto de los fondos activos, bajo su propio encabezado. Se eligen igual. */
  others: FundGroup[];
  initialGroupUuid: string;
  initialManagerUuid: string;
  paymentFundGroupUuid: string | null | undefined;
  fromCur: string;
  toCur: string;
  onBack: () => void;
  onConfirm: (groupUuid: string, managerUuid: string) => void;
}

interface FundRowProps {
  group: FundGroup;
  expanded: boolean;
  draftManagerUuid: string;
  paymentFundGroupUuid: string | null | undefined;
  onPickManager: (uuid: string) => void;
}

/**
 * Una fila de fondo: radio + insignia + nombre, y —solo la elegida— quién lo gestiona debajo.
 * El gestor vive dentro de la fila, no en un campo aparte que nace al elegir fondo.
 */
function FundRow({ group, expanded, draftManagerUuid, paymentFundGroupUuid, onPickManager }: FundRowProps) {
  const members = group.members ?? [];
  const fromPayment = isFundFromPayment(group.uuid, paymentFundGroupUuid);

  return (
    <div className={cn('border-b border-border/60', expanded && 'border-l-2 border-l-primary bg-primary/5')}>
      <label className="flex min-h-14 cursor-pointer items-center gap-2.5 py-2 pr-4 pl-3.5">
        <RadioGroupItem value={group.uuid} />
        <span
          className={cn(
            'flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg text-[11px] font-bold',
            avatarClass(group.uuid),
          )}
        >
          {fundBadge(group.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate text-sm', expanded ? 'font-semibold text-foreground' : 'text-foreground')}>
            {group.name}
            {group.currency ? <span className="font-normal text-muted-foreground"> · {group.currency}</span> : null}
          </span>
        </span>
        {fromPayment ? (
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
            DEL PAGO
          </span>
        ) : null}
      </label>

      {expanded && members.length > 1 ? (
        <div className="flex flex-col gap-1.5 px-4 pb-3 pl-9">
          <span className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">Quién lo gestiona</span>
          <div className="flex flex-wrap gap-1.5">
            {members.map((m) => (
              <button
                key={m.user_uuid}
                type="button"
                onClick={() => onPickManager(m.user_uuid)}
                className={cn(
                  'flex min-h-11 items-center gap-1.5 rounded-full border py-0.5 pr-3 pl-1 text-xs font-medium transition-colors',
                  m.user_uuid === draftManagerUuid
                    ? 'border-primary bg-card text-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/30',
                )}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                  {personInitials(m.username)}
                </span>
                {m.username || m.user_uuid}
                {m.is_fund_manager ? <span className="text-[10px] font-bold text-primary">GESTOR</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : expanded && members.length === 1 ? (
        <p className="px-4 pb-3 pl-9 text-xs text-muted-foreground">
          Gestiona <span className="font-medium text-foreground/80">{members[0].username || members[0].user_uuid}</span>
        </p>
      ) : expanded ? (
        <p className="px-4 pb-3 pl-9 text-xs text-muted-foreground">Este fondo no tiene a nadie asignado.</p>
      ) : null}
    </div>
  );
}

function SectionHeader({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/60 bg-muted/30 px-4 py-2">
      <span className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">{title}</span>
      {note ? <span className="text-[11px] text-pretty text-muted-foreground/80">{note}</span> : null}
    </div>
  );
}

/**
 * Paso de elegir fondo, dentro del mismo cajón — el mismo patrón que `ValueDifferenceStep`:
 * el cuerpo se reemplaza y la cabecera la toma `onHeaderChange` (lo hace `CreateOperationForm`,
 * que es quien monta este paso). No es una hoja encima de la hoja: eso rompía el scroll de la
 * hoja móvil y hacía que los `<Select>` de fondo y gestor abrieran un popup mal anclado.
 *
 * Lista TODOS los fondos activos, no solo los que el par sugiere: los sugeridos arriba y el
 * resto bajo «Otros fondos». Antes solo se ofrecían los sugeridos, y con uno solo el campo se
 * quedaba en quitar y poner el mismo fondo, sin nada que elegir.
 *
 * La elección vive en un borrador propio — no toca `fundGroupUuid`/`exchangeUserUuid` del
 * formulario hasta pulsar «Usar…» — para que «Volver» pueda deshacerla sin dejar el campo a
 * medio elegir.
 */
export function FundStep({
  suggested,
  others,
  initialGroupUuid,
  initialManagerUuid,
  paymentFundGroupUuid,
  fromCur,
  toCur,
  onBack,
  onConfirm,
}: FundStepProps) {
  const [draftGroupUuid, setDraftGroupUuid] = useState(initialGroupUuid);
  const [draftManagerUuid, setDraftManagerUuid] = useState(initialManagerUuid);
  const [query, setQuery] = useState('');

  // Con pocos fondos el buscador solo estorbaría; con más de ocho, hace falta.
  const withSearch = suggested.length + others.length > 8;
  const visibleSuggested = useMemo(
    () => (withSearch ? filterFundCandidates(suggested, query) : suggested),
    [withSearch, suggested, query],
  );
  const visibleOthers = useMemo(
    () => (withSearch ? filterFundCandidates(others, query) : others),
    [withSearch, others, query],
  );
  const nothingVisible = visibleSuggested.length === 0 && visibleOthers.length === 0;

  const draftGroup = [...suggested, ...others].find((g) => g.uuid === draftGroupUuid);
  const draftManager = draftGroup?.members?.find((m) => m.user_uuid === draftManagerUuid);

  const pickGroup = (radioValue: string) => {
    if (radioValue === NONE) {
      setDraftGroupUuid('');
      setDraftManagerUuid('');
      return;
    }
    const g = [...suggested, ...others].find((c) => c.uuid === radioValue);
    if (!g) return;
    setDraftGroupUuid(g.uuid);
    // El gestor por defecto es el marcado en el fondo; si ya se había elegido este mismo
    // fondo con otro gestor, se respeta — solo cambia al entrar por primera vez.
    setDraftManagerUuid(
      g.uuid === draftGroupUuid && draftManagerUuid ? draftManagerUuid : (defaultManagerFor(g)?.user_uuid ?? ''),
    );
  };

  // El nombre del fondo y el del gestor son datos del operador: «Efectivo Caracas (prueba
  // local) · diohandres» desborda el pie a 390 px. El verbo se queda fijo y lo que crece se
  // recorta — el `Button` trae `shrink-0`, así que hay que devolverle el permiso de encoger.
  const ctaDetail = draftGroup
    ? `${draftGroup.name}${draftManager ? ` · ${draftManager.username || draftManager.user_uuid}` : ''}`
    : null;

  const rowProps = {
    draftManagerUuid,
    paymentFundGroupUuid,
    onPickManager: setDraftManagerUuid,
  };

  return (
    <>
      <SidePanelBody className="gap-0 p-0">
        {withSearch ? (
          <div className="shrink-0 border-b border-border p-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar fondo…"
              className="h-11"
              autoFocus
            />
          </div>
        ) : null}

        <RadioGroup value={draftGroupUuid || NONE} onValueChange={pickGroup} className="flex w-full flex-col gap-0">
          <label className="flex min-h-14 cursor-pointer items-center gap-2.5 border-b border-border/60 px-4">
            <RadioGroupItem value={NONE} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-foreground">Sin fondo</span>
              <span className="block text-xs text-muted-foreground">no se descuenta de ningún saldo</span>
            </span>
          </label>

          {visibleSuggested.length > 0 ? (
            <>
              <SectionHeader title={fromCur && toCur ? `Para ${fromCur}/${toCur}` : 'Sugeridos'} />
              {visibleSuggested.map((g) => (
                <FundRow key={g.uuid} group={g} expanded={g.uuid === draftGroupUuid} {...rowProps} />
              ))}
            </>
          ) : null}

          {visibleOthers.length > 0 ? (
            <>
              <SectionHeader
                title="Otros fondos"
                note={
                  fromCur && toCur
                    ? `No liquidan en ${fromCur} ni ${toCur}. Se pueden usar igual.`
                    : 'Se pueden usar igual.'
                }
              />
              {visibleOthers.map((g) => (
                <FundRow key={g.uuid} group={g} expanded={g.uuid === draftGroupUuid} {...rowProps} />
              ))}
            </>
          ) : null}

          {nothingVisible ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {query.trim() ? `Ningún fondo coincide con «${query}».` : 'No hay fondos activos.'}
            </p>
          ) : null}
        </RadioGroup>
      </SidePanelBody>

      {/* `flex-nowrap`: el pie envuelve por defecto, y en un contenedor que envuelve la línea
          se rompe ANTES de que nadie encoja — el botón se iba a una segunda fila entera en vez
          de recortar su etiqueta. Sin envolver, `min-w-0 shrink` sí entra en juego. */}
      <SidePanelFooter className="flex-nowrap">
        <Button type="button" variant="ghost" onClick={onBack} className="shrink-0">
          <ChevronLeft className="h-4 w-4" />
          Volver
        </Button>
        <Button
          type="button"
          onClick={() => onConfirm(draftGroupUuid, draftManagerUuid)}
          className="min-w-0 shrink gap-1"
          title={ctaDetail ?? undefined}
        >
          <span className="shrink-0">Usar</span>
          {ctaDetail ? <span className="min-w-0 truncate">{ctaDetail}</span> : <span>sin fondo</span>}
        </Button>
      </SidePanelFooter>
    </>
  );
}
