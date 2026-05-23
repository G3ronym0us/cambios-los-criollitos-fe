'use client';

import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
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
import type { CurrencyPairData } from '@/types/admin';
import { TransactionStatus, type TransactionFilters as TxFilters } from '@/types/transaction';

const ALL = '__all__';

interface TransactionsFiltersProps {
  draftFilters: TxFilters;
  hasActiveFilters: boolean;
  currencyPairs: CurrencyPairData[];
  onStatusChange: (value: TransactionStatus | undefined) => void;
  onPairChange: (value: string | undefined) => void;
  onStartDateChange: (value: string | undefined) => void;
  onEndDateChange: (value: string | undefined) => void;
  onApply: () => void;
  onReset: () => void;
}

export function TransactionsFilters({
  draftFilters,
  hasActiveFilters,
  currencyPairs,
  onStatusChange,
  onPairChange,
  onStartDateChange,
  onEndDateChange,
  onApply,
  onReset,
}: TransactionsFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setExpanded((v) => !v)}
            className="-mx-2"
            aria-expanded={expanded}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {hasActiveFilters ? (
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                activos
              </span>
            ) : null}
          </Button>
          {hasActiveFilters ? (
            <Button variant="ghost" size="lg" onClick={onReset}>
              <RotateCcw className="h-4 w-4" />
              Limpiar
            </Button>
          ) : null}
        </div>

        {expanded ? (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="tx-status" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Estado
                </Label>
                <Select
                  value={(draftFilters.status_filter as string) || ALL}
                  onValueChange={(value) =>
                    onStatusChange(value === ALL ? undefined : (value as TransactionStatus))
                  }
                >
                  <SelectTrigger id="tx-status" className="h-10 w-full">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todos los estados</SelectItem>
                    <SelectItem value={TransactionStatus.COMPLETED}>Completada</SelectItem>
                    <SelectItem value={TransactionStatus.PENDING}>Pendiente</SelectItem>
                    <SelectItem value={TransactionStatus.CANCELLED}>Cancelada</SelectItem>
                    <SelectItem value={TransactionStatus.FAILED}>Fallida</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tx-pair" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Par de monedas
                </Label>
                <Select
                  value={draftFilters.currency_pair_uuid || ALL}
                  onValueChange={(value) =>
                    onPairChange(value === ALL ? undefined : (value as string))
                  }
                >
                  <SelectTrigger id="tx-pair" className="h-10 w-full">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todos los pares</SelectItem>
                    {currencyPairs.map((pair) => (
                      <SelectItem key={pair.uuid} value={pair.uuid}>
                        {pair.pair_symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tx-start" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Fecha inicio
                </Label>
                <Input
                  id="tx-start"
                  type="date"
                  value={draftFilters.start_date || ''}
                  onChange={(e) => onStartDateChange(e.target.value || undefined)}
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tx-end" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Fecha fin
                </Label>
                <Input
                  id="tx-end"
                  type="date"
                  value={draftFilters.end_date || ''}
                  onChange={(e) => onEndDateChange(e.target.value || undefined)}
                  className="h-10"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" size="lg" onClick={onReset}>
                Limpiar
              </Button>
              <Button size="lg" onClick={onApply}>
                Aplicar filtros
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
