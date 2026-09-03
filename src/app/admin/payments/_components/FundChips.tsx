'use client';

import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FundGroup } from '@/types/fund';
import { personInitials } from '../_lib/fundManagerField';

interface FundChipsProps {
  /** 2 o 3 fondos sugeridos por el par — con 1 o con 4+ se usa `FundManagerField`. */
  candidates: FundGroup[];
  selectedGroupUuid: string;
  selectedManagerUuid: string;
  /** Cuántos fondos más hay fuera de los sugeridos: si hay, se ofrece «Otro fondo». */
  otherCount: number;
  onSelectGroup: (uuid: string) => void;
  onSelectManager: (uuid: string) => void;
  /** Abre `FundStep` con la lista completa. */
  onOpenStep: () => void;
}

/**
 * Alternativa a `FundManagerField` cuando el par sugiere 2 o 3 fondos: con tan pocos, abrir un
 * paso del cajón es de más. Caben como chips en el propio formulario, y el gestor vive dentro
 * del chip elegido — nunca como campo aparte que nace al elegir fondo.
 *
 * Los sugeridos no son todos: el chip «Otro fondo» abre `FundStep` con la lista completa, para
 * que elegir un fondo que el par no sugiere no dependa de cambiar antes el par.
 */
export function FundChips({
  candidates,
  selectedGroupUuid,
  selectedManagerUuid,
  otherCount,
  onSelectGroup,
  onSelectManager,
  onOpenStep,
}: FundChipsProps) {
  const selectedGroup = candidates.find((g) => g.uuid === selectedGroupUuid);
  const members = selectedGroup?.members ?? [];

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground">
        Fondo y gestor <span className="text-muted-foreground/70">· opcional</span>
      </span>

      <div className="flex flex-wrap gap-1.5">
        {candidates.map((g) => (
          <button
            key={g.uuid}
            type="button"
            onClick={() => onSelectGroup(g.uuid)}
            className={cn(
              'flex min-h-11 items-center rounded-lg border px-3 text-sm font-medium transition-colors',
              g.uuid === selectedGroupUuid
                ? 'border-primary bg-primary/5 text-foreground'
                : 'border-border bg-card text-foreground/80 hover:bg-muted/30',
            )}
          >
            {g.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onSelectGroup('')}
          className={cn(
            'flex min-h-11 items-center rounded-lg border px-3 text-sm transition-colors',
            !selectedGroupUuid
              ? 'border-primary bg-primary/5 text-foreground'
              : 'border-border bg-card text-muted-foreground hover:bg-muted/30',
          )}
        >
          Sin fondo
        </button>
        {otherCount > 0 ? (
          <button
            type="button"
            onClick={onOpenStep}
            className="flex min-h-11 items-center gap-1 rounded-lg border border-dashed border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/30"
          >
            Otro fondo
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {selectedGroup && members.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 px-2.5 py-2">
          <span className="text-xs text-muted-foreground">Lo gestiona</span>
          {members.map((m) => (
            <button
              key={m.user_uuid}
              type="button"
              onClick={() => onSelectManager(m.user_uuid)}
              className={cn(
                'flex min-h-9 items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-1 text-xs font-medium transition-colors',
                m.user_uuid === selectedManagerUuid
                  ? 'border-primary bg-card text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted/30',
              )}
            >
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-muted text-[9.5px] font-bold text-muted-foreground">
                {personInitials(m.username)}
              </span>
              {m.username || m.user_uuid}
            </button>
          ))}
        </div>
      ) : selectedGroup && members.length === 1 ? (
        <p className="px-0.5 text-xs text-muted-foreground">
          Gestiona <span className="font-medium text-foreground/80">{members[0].username || members[0].user_uuid}</span>
        </p>
      ) : null}
    </div>
  );
}
