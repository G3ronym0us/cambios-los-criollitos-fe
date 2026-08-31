'use client';

import { RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ClientsFilters as Filters } from '../_hooks/useClients';

interface ClientsFiltersProps {
  filters: Filters;
  hasActiveFilters: boolean;
  /** Los pares en los que hoy hay deuda; vacío, el selector no se ofrece. */
  pairs: string[];
  onChange: (filters: Filters) => void;
  onReset: () => void;
}

/** Valor centinela del selector de par: `''` no lo admite el Select de shadcn. */
const ALL_PAIRS = 'ALL';

/**
 * La tira de filtros del directorio: buscar, deuda y par.
 *
 * Son tres controles a propósito. Lo que se hace aquí es buscar a alguien por nombre o
 * encontrar a quién hay que pagarle; el resto de atributos del cliente (bloqueado, seguido)
 * se ven como insignia en su fila y se trabajan desde su ficha.
 */
export function ClientsFilters({
  filters,
  hasActiveFilters,
  pairs,
  onChange,
  onReset,
}: ClientsFiltersProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-muted/40 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-end sm:px-5">
      <div className="flex flex-1 flex-col gap-1.5 sm:min-w-[210px]">
        <Label
          htmlFor="clients-search"
          className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
        >
          Buscar
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="clients-search"
            type="search"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Nombre o teléfono"
            className="h-10 pl-9"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 sm:min-w-[190px]">
        <Label
          htmlFor="clients-pending-filter"
          className={cn(
            'text-[10px] font-bold uppercase tracking-wider',
            filters.pending === 'YES' ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          Por entregar
        </Label>
        <Select
          value={filters.pending}
          onValueChange={(value) => onChange({ ...filters, pending: value as Filters['pending'] })}
        >
          <SelectTrigger
            id="clients-pending-filter"
            className={cn(
              'h-10 w-full sm:w-[190px]',
              filters.pending === 'YES' ? 'border-primary ring-3 ring-primary/10' : '',
            )}
          >
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="YES">Con pendiente</SelectItem>
            <SelectItem value="NO">Sin pendiente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {pairs.length > 0 ? (
        <div className="flex flex-col gap-1.5 sm:min-w-[150px]">
          <Label
            htmlFor="clients-pair-filter"
            className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
          >
            Par
          </Label>
          <Select
            value={filters.pair || ALL_PAIRS}
            onValueChange={(value) =>
              onChange({ ...filters, pair: !value || value === ALL_PAIRS ? '' : value })
            }
          >
            <SelectTrigger id="clients-pair-filter" className="h-10 w-full sm:w-[150px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PAIRS}>Todos los pares</SelectItem>
              {pairs.map((pair) => (
                <SelectItem key={pair} value={pair}>
                  {pair}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {hasActiveFilters ? (
        <Button variant="ghost" onClick={onReset} className="h-10 sm:ml-auto">
          <RotateCcw className="h-4 w-4" />
          Limpiar filtros
        </Button>
      ) : null}
    </div>
  );
}
