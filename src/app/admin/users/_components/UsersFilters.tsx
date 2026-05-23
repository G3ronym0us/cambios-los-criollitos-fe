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
import type { UsersFilters as Filters } from '../_hooks/useUsers';

interface UsersFiltersProps {
  filters: Filters;
  hasActiveFilters: boolean;
  onChange: (filters: Filters) => void;
  onReset: () => void;
}

export function UsersFilters({
  filters,
  hasActiveFilters,
  onChange,
  onReset,
}: UsersFiltersProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-6">
        <div className="flex flex-1 flex-col gap-1.5 sm:min-w-[240px]">
          <Label htmlFor="users-search" className="text-xs uppercase tracking-wide text-muted-foreground">
            Buscar
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="users-search"
              type="search"
              value={filters.search}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
              placeholder="Nombre, usuario o email"
              className="h-10 pl-9"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 sm:min-w-[160px]">
          <Label htmlFor="users-role-filter" className="text-xs uppercase tracking-wide text-muted-foreground">
            Rol
          </Label>
          <Select
            value={filters.role as string}
            onValueChange={(value) =>
              onChange({ ...filters, role: value as Filters['role'] })
            }
          >
            <SelectTrigger id="users-role-filter" className="h-10 w-full sm:w-[160px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los roles</SelectItem>
              <SelectItem value="USER">Usuario</SelectItem>
              <SelectItem value="MODERATOR">Moderador</SelectItem>
              <SelectItem value="ROOT">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 sm:min-w-[180px]">
          <Label htmlFor="users-commission-filter" className="text-xs uppercase tracking-wide text-muted-foreground">
            Comisiones
          </Label>
          <Select
            value={filters.commission as string}
            onValueChange={(value) =>
              onChange({ ...filters, commission: value as Filters['commission'] })
            }
          >
            <SelectTrigger id="users-commission-filter" className="h-10 w-full sm:w-[180px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="YES">Reciben comisión</SelectItem>
              <SelectItem value="NO">Sin comisión</SelectItem>
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
