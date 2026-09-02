'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { SidePanelBody, SidePanelFooter } from '@/components/shared/SidePanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import type { FundGroup } from '@/types/fund';
import {
  defaultManagerFor,
  filterFundCandidates,
  isFundFromPayment,
  personInitials,
} from '../_lib/fundManagerField';

/** Valor interno para «sin fondo»: el radio no admite un value vacío como opción real. */
const NONE = '__sin_fondo__';

interface FundStepProps {
  candidates: FundGroup[];
  initialGroupUuid: string;
  initialManagerUuid: string;
  paymentFundGroupUuid: string | null | undefined;
  onBack: () => void;
  onConfirm: (groupUuid: string, managerUuid: string) => void;
}

/**
 * Paso de elegir fondo, dentro del mismo cajón — el mismo patrón que `ValueDifferenceStep`:
 * el cuerpo se reemplaza y la cabecera la toma `onHeaderChange` (lo hace `CreateOperationForm`,
 * que es quien monta este paso). No es una hoja encima de la hoja: eso rompía el scroll de la
 * hoja móvil y hacía que los `<Select>` de fondo y gestor abrieran un popup mal anclado.
 *
 * La elección vive en un borrador propio — no toca `fundGroupUuid`/`exchangeUserUuid` del
 * formulario hasta pulsar «Usar…» — para que «Volver» pueda deshacerla sin dejar el campo a
 * medio elegir.
 */
export function FundStep({
  candidates,
  initialGroupUuid,
  initialManagerUuid,
  paymentFundGroupUuid,
  onBack,
  onConfirm,
}: FundStepProps) {
  const [draftGroupUuid, setDraftGroupUuid] = useState(initialGroupUuid);
  const [draftManagerUuid, setDraftManagerUuid] = useState(initialManagerUuid);
  const [query, setQuery] = useState('');

  // Con pocos fondos el buscador solo estorbaría; con más de ocho, hace falta.
  const withSearch = candidates.length > 8;
  const visible = useMemo(
    () => (withSearch ? filterFundCandidates(candidates, query) : candidates),
    [withSearch, candidates, query],
  );

  const draftGroup = candidates.find((g) => g.uuid === draftGroupUuid);
  const draftManager = draftGroup?.members?.find((m) => m.user_uuid === draftManagerUuid);

  const pickGroup = (radioValue: string) => {
    if (radioValue === NONE) {
      setDraftGroupUuid('');
      setDraftManagerUuid('');
      return;
    }
    const g = candidates.find((c) => c.uuid === radioValue);
    if (!g) return;
    setDraftGroupUuid(g.uuid);
    // El gestor por defecto es el marcado en el fondo; si ya se había elegido este mismo
    // fondo con otro gestor, se respeta — solo cambia al entrar por primera vez.
    setDraftManagerUuid(
      g.uuid === draftGroupUuid && draftManagerUuid ? draftManagerUuid : (defaultManagerFor(g)?.user_uuid ?? ''),
    );
  };

  const ctaLabel = draftGroup
    ? `Usar ${draftGroup.name}${draftManager ? ` · ${draftManager.username || draftManager.user_uuid}` : ''}`
    : 'Usar sin fondo';

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
            <span className="text-sm text-foreground">Sin fondo</span>
          </label>

          {visible.map((g) => {
            const expanded = g.uuid === draftGroupUuid;
            const members = g.members ?? [];
            const fromPayment = isFundFromPayment(g.uuid, paymentFundGroupUuid);
            return (
              <div
                key={g.uuid}
                className={cn('border-b border-border/60', expanded && 'border-l-2 border-l-primary bg-primary/5')}
              >
                <label className="flex min-h-14 cursor-pointer items-center gap-2.5 py-2 pr-4 pl-3.5">
                  <RadioGroupItem value={g.uuid} />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-sm', expanded ? 'font-semibold text-foreground' : 'text-foreground')}>
                      {g.name}
                      {g.currency ? <span className="font-normal text-muted-foreground"> · {g.currency}</span> : null}
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
                    <span className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                      Quién lo gestiona
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {members.map((m) => (
                        <button
                          key={m.user_uuid}
                          type="button"
                          onClick={() => setDraftManagerUuid(m.user_uuid)}
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
                    Gestiona{' '}
                    <span className="font-medium text-foreground/80">{members[0].username || members[0].user_uuid}</span>
                  </p>
                ) : null}
              </div>
            );
          })}

          {visible.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Ningún fondo coincide con «{query}».
            </p>
          ) : null}
        </RadioGroup>
      </SidePanelBody>

      <SidePanelFooter>
        <Button type="button" variant="ghost" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
          Volver
        </Button>
        <Button type="button" onClick={() => onConfirm(draftGroupUuid, draftManagerUuid)}>
          {ctaLabel}
        </Button>
      </SidePanelFooter>
    </>
  );
}
