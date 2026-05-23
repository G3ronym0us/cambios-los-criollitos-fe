'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MyProfitsFiltersProps {
  startDate: string;
  endDate: string;
  loading: boolean;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onApply: () => void;
}

export function MyProfitsFilters({
  startDate,
  endDate,
  loading,
  onStartDateChange,
  onEndDateChange,
  onApply,
}: MyProfitsFiltersProps) {
  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end lg:gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="my-start" className="text-xs uppercase tracking-wide text-muted-foreground">
            Fecha inicio
          </Label>
          <Input
            id="my-start"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="h-10"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="my-end" className="text-xs uppercase tracking-wide text-muted-foreground">
            Fecha fin
          </Label>
          <Input
            id="my-end"
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="h-10"
          />
        </div>

        <Button size="lg" onClick={onApply} disabled={loading}>
          {loading ? 'Cargando...' : 'Aplicar filtros'}
        </Button>
      </CardContent>
    </Card>
  );
}
