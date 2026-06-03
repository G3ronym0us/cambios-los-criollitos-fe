'use client';

import { RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ClientsFilters as Filters } from '../_hooks/useClients';

interface ClientsFiltersProps {
  filters: Filters;
  hasActiveFilters: boolean;
  onChange: (filters: Filters) => void;
  onReset: () => void;
}

export function ClientsFilters({ filters, hasActiveFilters, onChange, onReset }: ClientsFiltersProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-6">
        <div className="flex flex-1 flex-col gap-1.5 sm:min-w-[240px]">
          <Label htmlFor="clients-search" className="text-xs uppercase tracking-wide text-muted-foreground">
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

        <div className="flex flex-col gap-1.5 sm:min-w-[160px]">
          <Label htmlFor="clients-tracked-filter" className="text-xs uppercase tracking-wide text-muted-foreground">
            Seguimiento
          </Label>
          <Select
            value={filters.tracked}
            onValueChange={(value) => onChange({ ...filters, tracked: value as Filters['tracked'] })}
          >
            <SelectTrigger id="clients-tracked-filter" className="h-10 w-full sm:w-[160px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="YES">Seguidos</SelectItem>
              <SelectItem value="NO">No seguidos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 sm:min-w-[160px]">
          <Label htmlFor="clients-blocked-filter" className="text-xs uppercase tracking-wide text-muted-foreground">
            Estado
          </Label>
          <Select
            value={filters.blocked}
            onValueChange={(value) => onChange({ ...filters, blocked: value as Filters['blocked'] })}
          >
            <SelectTrigger id="clients-blocked-filter" className="h-10 w-full sm:w-[160px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="NO">Activos</SelectItem>
              <SelectItem value="YES">Bloqueados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters ? (
          <Button variant="ghost" size="lg" onClick={onReset} className="sm:ml-auto">
            <RotateCcw className="h-4 w-4" />
            Limpiar filtros
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
