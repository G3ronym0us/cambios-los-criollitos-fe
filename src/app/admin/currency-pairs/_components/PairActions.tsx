'use client';

import { useRouter } from 'next/navigation';
import { DollarSign, Edit, History, MoreHorizontal, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CurrencyPairData } from '@/types/admin';

interface PairActionsProps {
  pair: CurrencyPairData;
  onEdit: (pair: CurrencyPairData) => void;
  onDelete: (uuid: string) => void;
  onShowHistory: (pair: CurrencyPairData) => void;
  onManualRate: (pair: CurrencyPairData) => void;
}

export function PairActions({
  pair,
  onEdit,
  onDelete,
  onShowHistory,
  onManualRate,
}: PairActionsProps) {
  const router = useRouter();
  const configsHref = `/admin/currency-pairs/${pair.uuid}/configs`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="icon-lg"
            aria-label={`Acciones para ${pair.display_name}`}
            className="min-h-11 min-w-11"
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-[12rem]">
        <DropdownMenuItem onClick={() => onEdit(pair)}>
          <Edit className="mr-2 h-4 w-4" /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onManualRate(pair)}>
          <Settings className="mr-2 h-4 w-4" /> Precio manual
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
