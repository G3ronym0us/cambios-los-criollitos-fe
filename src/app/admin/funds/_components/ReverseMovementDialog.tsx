'use client';

import type { FormEvent } from 'react';
import { Undo2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { FundMovement } from '@/types/fund';
import { formatUSDT } from '../_lib/format';
import { movementMeta } from './movementMeta';

interface ReverseMovementDialogProps {
  open: boolean;
  movement: FundMovement | null;
  reason: string;
  error: string;
  submitting: boolean;
  onReasonChange: (reason: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

/**
 * Anular un movimiento no lo borra: crea otro que lo referencia y devuelve el saldo. El
 * motivo es obligatorio porque es lo único que queda explicando por qué el libro tiene dos
 * líneas en vez de ninguna.
 */
export function ReverseMovementDialog({
  open,
  movement,
  reason,
  error,
  submitting,
  onReasonChange,
  onSubmit,
  onCancel,
}: ReverseMovementDialogProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-4 w-4" />
            Reversar movimiento
          </DialogTitle>
          <DialogDescription>
            {movement
              ? `Se anulará el ${movementMeta(movement.movement_type).label.toLowerCase()} de ${formatUSDT(
                  movement.amount_usdt,
                )} USDT con un movimiento opuesto.`
              : 'Se anulará el movimiento con uno opuesto.'}
          </DialogDescription>
        </DialogHeader>

        <form id="reverse-movement-form" onSubmit={handleSubmit} className="space-y-4">
          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs leading-5 text-muted-foreground">
            El movimiento original <span className="font-medium text-foreground">no se borra</span>
            : queda en el historial marcado como reversado, junto a la línea que lo anula. El
            saldo vuelve a donde estaba.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="reverse-reason">Motivo</Label>
            <Textarea
              id="reverse-reason"
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Ej: cargado dos veces por error"
              rows={3}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Queda guardado en la reversa: es lo que va a leer quien revise esto en dos meses.
            </p>
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="reverse-movement-form"
            disabled={submitting || reason.trim().length < 3}
          >
            {submitting ? 'Reversando...' : 'Reversar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
