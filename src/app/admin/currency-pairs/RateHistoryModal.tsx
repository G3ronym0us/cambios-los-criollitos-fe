'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bot,
  Clock,
  Database,
  Settings,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { ExchangeRateResponse } from '@/types/currency';
import { ratesService } from '@/services/ratesService';
import { CurrencyPairData } from '@/types/admin';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getCurrencySymbol } from '@/utils/currencyConfig';

interface RateHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPair: CurrencyPairData;
}

type Tone = 'success' | 'info' | 'primary' | 'neutral';

const pairTypeTone: Record<string, Tone> = {
  base: 'success',
  derived: 'info',
  cross: 'primary',
};

const LIMIT_OPTIONS = [5, 10, 20, 50, 100];

export default function RateHistoryModal({
  isOpen,
  onClose,
  selectedPair,
}: RateHistoryModalProps) {
  const [rates, setRates] = useState<ExchangeRateResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);

  const toSymbol = getCurrencySymbol(selectedPair.to_currency.symbol) || selectedPair.to_currency.symbol;

  const fetchRateHistory = useCallback(async () => {
    if (!selectedPair) return;
    setLoading(true);
    setError(null);
    try {
      const response = await ratesService.getLatestRatesByPair(
        selectedPair.uuid,
        limit
      );
      if (response.success && response.data) {
        setRates(response.data);
      } else {
        setError(response.error || 'Error al cargar el historial de tasas');
      }
    } catch {
      setError('Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  }, [selectedPair, limit]);

  useEffect(() => {
    if (isOpen && selectedPair) {
      fetchRateHistory();
    }
  }, [isOpen, selectedPair, limit, fetchRateHistory]);

  const formatNumber = (num: number) =>
    num.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });

  const formatDate = (dateString: string) => ratesService.formatRateDate(dateString);

  const getRateTrend = (index: number): 'up' | 'down' | 'neutral' => {
    if (index === rates.length - 1) return 'neutral';
    const currentRate = rates[index].rate;
    const previousRate = rates[index + 1].rate;
    if (currentRate > previousRate) return 'up';
    if (currentRate < previousRate) return 'down';
    return 'neutral';
  };

  const calculatePercentageDifference = (
    manualRate: number,
    automaticRate: number
  ): { percentage: number; isHigher: boolean } => {
    const difference = ((manualRate - automaticRate) / automaticRate) * 100;
    return {
      percentage: Math.abs(difference),
      isHigher: difference > 0,
    };
  };

  const highest = rates.length ? Math.max(...rates.map((r) => r.rate)) : 0;
  const lowest = rates.length ? Math.min(...rates.map((r) => r.rate)) : 0;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 sm:max-w-3xl">
        <DialogHeader className="pr-8">
          <DialogTitle>{selectedPair.display_name}</DialogTitle>
          <DialogDescription>
            Historial de tasas — {selectedPair.from_currency.name} → {selectedPair.to_currency.name}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Label htmlFor="rate-history-limit" className="text-xs uppercase tracking-wide text-muted-foreground">
            Mostrar
          </Label>
          <Select
            value={String(limit)}
            onValueChange={(value) => setLimit(Number(value))}
          >
            <SelectTrigger id="rate-history-limit" className="h-10 w-full sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIMIT_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={String(opt)}>
                  {opt} registros
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <LoadingState label="Cargando historial..." />
          ) : error ? (
            <EmptyState
              icon={Database}
              title="No se pudo cargar el historial"
              description={error}
              actions={
                <Button variant="outline" onClick={fetchRateHistory}>
                  Reintentar
                </Button>
              }
            />
          ) : rates.length === 0 ? (
            <EmptyState
              icon={Database}
              title="Sin registros"
              description="No se encontraron tasas para este par de monedas."
            />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/40 p-4 sm:grid-cols-3">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Tasa actual</p>
                  <p className="mt-1 text-xl font-bold text-foreground">
                    {formatNumber(rates[0]?.rate)} <span className="text-sm font-medium text-muted-foreground">{toSymbol}</span>
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Más alta</p>
                  <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatNumber(highest)} <span className="text-sm font-medium text-muted-foreground">{toSymbol}</span>
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Más baja</p>
                  <p className="mt-1 text-xl font-bold text-rose-600 dark:text-rose-400">
                    {formatNumber(lowest)} <span className="text-sm font-medium text-muted-foreground">{toSymbol}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {rates.map((rate, index) => {
                  const trend = getRateTrend(index);
                  return (
                    <div
                      key={rate.uuid}
                      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {trend === 'up' ? (
                            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          ) : trend === 'down' ? (
                            <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                          ) : (
                            <span className="h-4 w-4" />
                          )}
                          <span className="text-lg font-bold text-foreground">
                            {formatNumber(rate.rate)}
                          </span>
                          <span className="text-sm text-muted-foreground">{toSymbol}</span>

                          <StatusBadge tone={pairTypeTone[rate.pair_type.toLowerCase()] ?? 'neutral'} icon={Database}>
                            {rate.pair_type.replace('_', ' ').toUpperCase()}
                          </StatusBadge>

                          {rate.percentage ? (
                            <StatusBadge tone="warning">
                              {rate.inverse_percentage ? '-' : '+'}
                              {rate.percentage}%
                            </StatusBadge>
                          ) : null}
                        </div>

                        {rate.is_manual && rate.manual_rate && rate.automatic_rate
                          ? (() => {
                              const { percentage, isHigher } = calculatePercentageDifference(
                                rate.manual_rate,
                                rate.automatic_rate
                              );
                              return (
                                <div className="flex flex-col gap-1.5 pl-6 text-sm">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Settings className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                    <span className="font-medium text-amber-700 dark:text-amber-400">Manual:</span>
                                    <span className="font-semibold text-foreground">
                                      {formatNumber(rate.manual_rate)} {toSymbol}
                                    </span>
                                    <StatusBadge tone="warning">ACTIVO</StatusBadge>
                                    <StatusBadge tone={isHigher ? 'destructive' : 'success'}>
                                      {isHigher ? '+' : '-'}
                                      {percentage.toFixed(2)}%
                                    </StatusBadge>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                                    <Bot className="h-3.5 w-3.5" />
                                    <span className="font-medium">Automático:</span>
                                    <span>
                                      {formatNumber(rate.automatic_rate)} {toSymbol}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()
                          : null}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
                        <Clock className="h-4 w-4" />
                        {formatDate(rate.created_at)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
