'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PERIOD_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 7, label: 'Últimos 7 días' },
  { value: 30, label: 'Últimos 30 días' },
  { value: 90, label: 'Últimos 90 días' },
  { value: 365, label: 'Último año' },
];

interface PeriodSelectProps {
  value: number;
  onChange: (days: number) => void;
}

export function PeriodSelect({ value, onChange }: PeriodSelectProps) {
  return (
    <div className="flex flex-col gap-1.5 sm:min-w-[200px]">
      <Label htmlFor="period-select" className="text-xs uppercase tracking-wide text-muted-foreground">
        Período
      </Label>
      <Select
        value={String(value)}
        onValueChange={(next) => onChange(Number(next))}
      >
        <SelectTrigger id="period-select" className="h-10 w-full sm:w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={String(opt.value)}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
