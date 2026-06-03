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
import type { OperationsFilters as Filters } from '../_hooks/useOperations';

interface OperationsFiltersProps {
  filters: Filters;
  hasActiveFilters: boolean;
  onChange: (filters: Filters) => void;
  onReset: () => void;
}

export function OperationsFilters({ filters, hasActiveFilters, onChange, onReset }: OperationsFiltersProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-6">
        <div className="flex flex-1 flex-col gap-1.5 sm:min-w-[240px]">
          <Label htmlFor="ops-search" className="text-xs uppercase tracking-wide text-muted-foreground">
            Buscar
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="ops-search"
              type="search"
              value={filters.search}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
              placeholder="Cliente, teléfono o par"
              className="h-10 pl-9"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 sm:min-w-[170px]">
          <Label htmlFor="ops-status-filter" className="text-xs uppercase tracking-wide text-muted-foreground">
            Estado
          </Label>
          <Select
            value={filters.status}
            onValueChange={(value) => onChange({ ...filters, status: value as Filters['status'] })}
          >
            <SelectTrigger id="ops-status-filter" className="h-10 w-full sm:w-[170px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="QUOTED">Cotizadas</SelectItem>
              <SelectItem value="PENDING">Pendientes</SelectItem>
              <SelectItem value="COMPLETED">Completadas</SelectItem>
              <SelectItem value="CANCELLED">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 sm:min-w-[170px]">
          <Label htmlFor="ops-delivery-filter" className="text-xs uppercase tracking-wide text-muted-foreground">
            Entrega
          </Label>
          <Select
            value={filters.delivery}
            onValueChange={(value) => onChange({ ...filters, delivery: value as Filters['delivery'] })}
          >
            <SelectTrigger id="ops-delivery-filter" className="h-10 w-full sm:w-[170px]">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              <SelectItem value="PENDING">Por entregar</SelectItem>
              <SelectItem value="RECEIVED">Entregadas</SelectItem>
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
