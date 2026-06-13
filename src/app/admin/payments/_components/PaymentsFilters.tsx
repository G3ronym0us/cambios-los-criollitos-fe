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
import type { OutgoingClass } from '../_hooks/usePayments';

const OUT_CLASS_LABELS: Record<OutgoingClass, string> = {
  ALL: 'Todos',
  UNLINKED: 'Sin vincular',
  OPERATIONAL: 'Operativos',
  PERSONAL: 'Gastos personales',
  IRRELEVANT: 'Irrelevantes',
};

interface PaymentsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  showClassification: boolean;
  outClass: OutgoingClass;
  onClassChange: (value: OutgoingClass) => void;
  hasActiveFilters: boolean;
  onReset: () => void;
}

export function PaymentsFilters({
  search,
  onSearchChange,
  showClassification,
  outClass,
  onClassChange,
  hasActiveFilters,
  onReset,
}: PaymentsFiltersProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-6">
        <div className="flex flex-1 flex-col gap-1.5 sm:min-w-[240px]">
          <Label htmlFor="payments-search" className="text-xs uppercase tracking-wide text-muted-foreground">
            Buscar
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="payments-search"
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cliente, banco, referencia"
              className="h-10 pl-9"
            />
          </div>
        </div>

        {showClassification ? (
          <div className="flex flex-col gap-1.5 sm:min-w-[180px]">
            <Label htmlFor="payments-class-filter" className="text-xs uppercase tracking-wide text-muted-foreground">
              Clasificación
            </Label>
            <Select value={outClass} onValueChange={(value) => onClassChange((value as OutgoingClass) ?? 'ALL')}>
              <SelectTrigger id="payments-class-filter" className="h-10 w-full sm:w-[180px]">
                <SelectValue>{OUT_CLASS_LABELS[outClass] ?? 'Todos'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="UNLINKED">Sin vincular</SelectItem>
                <SelectItem value="OPERATIONAL">Operativos</SelectItem>
                <SelectItem value="PERSONAL">Gastos personales</SelectItem>
                <SelectItem value="IRRELEVANT">Irrelevantes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}

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
