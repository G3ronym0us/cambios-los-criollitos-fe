'use client';

import { cn } from '@/lib/utils';
import type { FundGroup } from '@/types/fund';
import { personInitials } from '../_lib/fundManagerField';

interface FundChipsProps {
  /** 2 o 3 fondos candidatos — con 1 o con 4+ se usa `FundManagerField` en su lugar. */
  candidates: FundGroup[];
  selectedGroupUuid: string;
  selectedManagerUuid: string;
  onSelectGroup: (uuid: string) => void;
  onSelectManager: (uuid: string) => void;
}

/**
 * Alternativa a `FundManagerField` cuando el par deja 2 o 3 fondos candidatos: con tan pocos,
 * abrir un paso del cajón es de más. Caben como chips en el propio formulario, y el gestor
 * vive dentro del chip elegido — nunca como campo aparte que nace al elegir fondo.
 */
export function FundChips({
  candidates,
  selectedGroupUuid,
  selectedManagerUuid,
  onSelectGroup,
  onSelectManager,
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

      <p className="text-[11px] text-pretty text-muted-foreground">
        Cero aperturas, cero saltos: solo el nombre del fondo y, debajo, quién lo gestiona.
      </p>
    </div>
  );
}
