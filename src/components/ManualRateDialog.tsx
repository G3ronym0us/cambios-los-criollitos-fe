'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ManualRateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSetRate: (rate: number) => Promise<boolean>;
  onRemoveRate: () => void;
  fromCurrency: string;
  toCurrency: string;
  currentRate?: number;
  automaticRate?: number;
  isManual?: boolean;
  isLoading?: boolean;
}

export default function ManualRateDialog({
  isOpen,
  onClose,
  onSetRate,
  onRemoveRate,
  fromCurrency,
  toCurrency,
  currentRate,
  automaticRate,
  isManual = false,
  isLoading = false,
}: ManualRateDialogProps) {
  const [manualRate, setManualRate] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setManualRate(currentRate?.toString() ?? '');
    }
  }, [isOpen, currentRate]);

  const isValidRate = () => {
    const rate = parseFloat(manualRate);
    return !isNaN(rate) && rate > 0;
  };

  const handleSetRate = async () => {
    const rate = parseFloat(manualRate);
    if (isNaN(rate) || rate <= 0) return;
    const success = await onSetRate(rate);
    if (success) onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next && !isLoading) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pr-8">
          <DialogTitle>Gestión de Precio Manual</DialogTitle>
          <DialogDescription>
            Par: <span className="font-medium text-foreground">{fromCurrency}/{toCurrency}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {automaticRate ? (
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Precio automático: </span>
              <span className="font-medium text-foreground">{automaticRate.toFixed(4)}</span>
            </div>
          ) : null}

          {isManual && currentRate ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Este par tiene un precio manual activo: <strong>{currentRate.toFixed(4)}</strong>
              </span>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="manual-rate-input">Nuevo precio manual</Label>
            <Input
              id="manual-rate-input"
              type="number"
              step="0.0001"
              min="0"
              value={manualRate}
              onChange={(e) => setManualRate(e.target.value)}
              placeholder="Ingrese el precio manual"
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          {isManual ? (
            <Button
              variant="destructive"
              onClick={onRemoveRate}
              disabled={isLoading}
            >
              Remover precio
            </Button>
          ) : (
            <span className="hidden sm:block" />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleSetRate} disabled={!isValidRate() || isLoading}>
              {isLoading ? 'Guardando...' : 'Establecer precio'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
