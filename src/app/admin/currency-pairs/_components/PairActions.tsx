'use client';

import { useRouter } from 'next/navigation';
import { DollarSign, History, MoreHorizontal, Settings2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { CurrencyPairData } from '@/types/admin';
import type { PairHealth } from '../_lib/pairHealth';

interface PairActionsProps {
  pair: CurrencyPairData;
  health: PairHealth;
  onEdit: (pair: CurrencyPairData) => void;
  onDelete: (uuid: string) => void;
  onShowHistory: (pair: CurrencyPairData) => void;
}

/**
 * El menú queda para lo que no es diario (historial, comisiones, eliminar).
 * Un par con alerta cambia el menú por un botón directo: lo que hace falta ahí
 * no es elegir, es ir a arreglarlo.
 */
export function PairActions({
  pair,
  health,
  onEdit,
  onDelete,
  onShowHistory,
}: PairActionsProps) {
  const router = useRouter();
  const configsHref = `/admin/currency-pairs/${pair.uuid}/configs`;

  if (health === 'stale' || health === 'missing') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => onEdit(pair)}
        className={cn(
          'min-h-11 lg:min-h-9',
          health === 'missing'
            ? 'border-destructive/40 text-destructive hover:text-destructive'
            : 'border-amber-500/40 text-amber-700 dark:text-amber-400'
        )}
      >
        {health === 'missing' ? 'Corregir' : 'Revisar'}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Acciones para ${pair.display_name}`}
            className="min-h-11 min-w-11 lg:min-h-9 lg:min-w-9"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-[12rem]">
        <DropdownMenuItem onClick={() => onEdit(pair)}>
          <Settings2 className="mr-2 h-4 w-4" /> Configurar par
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onShowHistory(pair)}>
          <History className="mr-2 h-4 w-4" /> Historial de tasas
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(configsHref)}>
          <DollarSign className="mr-2 h-4 w-4" /> Comisiones
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => onDelete(pair.uuid)}>
          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
