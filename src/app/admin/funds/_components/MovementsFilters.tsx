'use client';

import { RotateCcw } from 'lucide-react';
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
import { MovementType, type FundMovementFilters } from '@/types/fund';
import { MOVEMENT_LABELS } from './movementMeta';

const ALL = '__all__';

interface MovementsFiltersProps {
  filters: FundMovementFilters;
  hasActiveFilters: boolean;
  onChange: (filters: FundMovementFilters) => void;
  onReset: () => void;
}

export function MovementsFilters({
  filters,
  hasActiveFilters,
  onChange,
  onReset,
}: MovementsFiltersProps) {
  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end lg:gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="mov-type" className="text-xs uppercase tracking-wide text-muted-foreground">
            Tipo
          </Label>
          <Select
            value={(filters.movement_type as string) || ALL}
            onValueChange={(value) =>
              onChange({
                ...filters,
                movement_type: value === ALL ? undefined : (value as MovementType),
              })
            }
          >
            <SelectTrigger id="mov-type" className="h-10 w-full">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los tipos</SelectItem>
              {Object.values(MovementType).map((t) => (
                <SelectItem key={t} value={t}>
                  {MOVEMENT_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mov-from" className="text-xs uppercase tracking-wide text-muted-foreground">
            Desde
          </Label>
          <Input
            id="mov-from"
            type="date"
            value={filters.date_from || ''}
            onChange={(e) => onChange({ ...filters, date_from: e.target.value || undefined })}
            className="h-10"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mov-to" className="text-xs uppercase tracking-wide text-muted-foreground">
            Hasta
          </Label>
          <Input
            id="mov-to"
            type="date"
            value={filters.date_to || ''}
            onChange={(e) => onChange({ ...filters, date_to: e.target.value || undefined })}
            className="h-10"
          />
        </div>

        {hasActiveFilters ? (
          <Button variant="ghost" size="lg" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
            Limpiar
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
