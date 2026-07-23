'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Trash2, Unlink } from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import { formatNumber } from '@/utils/functions';
import type { OrphanAction, UnlinkPreview } from '@/types/operation';

interface UnlinkOrphanDialogProps {
  /** Preview del backend; el diálogo se muestra solo cuando `would_orphan`. */
  preview: UnlinkPreview | null;
  submitting?: boolean;
  onCancel: () => void;
  onDecide: (action: OrphanAction, note: string | null) => void;
}

/**
 * Cuadro que sale al desvincular el ÚNICO comprobante de una operación. Dos salidas:
 * borrar la operación con su rastro contable, o conservarla dejando firmado quién aceptó
 * que se quede sin pago asociado. No hay una tercera vía silenciosa.
 */
export function UnlinkOrphanDialog({
  preview,
  submitting = false,
  onCancel,
  onDecide,
}: UnlinkOrphanDialogProps) {
  const { user } = useAuth();
  const [note, setNote] = useState('');

  useEffect(() => {
    if (preview) setNote('');
  }, [preview]);

  const op = preview?.operation ?? null;
  if (!preview?.would_orphan || !op) return null;

  const canDelete = preview.can_delete !== false;
  const movements = preview.fund_movements ?? [];
  const who = user?.full_name || user?.username || 'tu usuario';

  return (
    <Dialog open onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Es el único pago de la operación</DialogTitle>
          <DialogDescription>
            Al desvincularlo, la operación se queda sin ningún comprobante que la respalde
            {op.status === 'COMPLETED' ? ' — y estando completada ya no puede cambiar de estado' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border border-border p-3 text-sm">
            <p className="font-medium text-foreground">
              {formatNumber(op.from_amount)} {op.from_currency ?? ''} →{' '}
              {formatNumber(op.to_amount)} {op.to_currency ?? ''}
            </p>
            <p className="text-xs text-muted-foreground">
              {op.pair_symbol ?? ''} · {op.status} · {op.uuid.slice(0, 8)}
            </p>
          </div>

          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Trash2 className="h-3.5 w-3.5 shrink-0 text-destructive" />
              Si eliges borrarla, se va también:
            </p>
            <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
              <li>· La operación y su cotización</li>
              {preview.transaction_uuid ? (
                <li>· Su transacción contable y el reparto de ganancia</li>
              ) : null}
              {movements.map((m) => (
                <li key={m.uuid}>
                  · Movimiento {m.movement_type ?? ''} de {formatNumber(m.amount)} {m.currency}
                  {preview.fund_group_name ? ` en ${preview.fund_group_name}` : ''}
                </li>
              ))}
              {!preview.transaction_uuid && movements.length === 0 ? (
                <li>· No dejó transacción ni movimientos de fondo</li>
              ) : null}
            </ul>
            <p className="mt-1.5 text-xs text-muted-foreground">El comprobante no se borra.</p>
          </div>

          {!canDelete ? (
            <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Esta operación movió el saldo a favor del cliente ({preview.balance_entries}{' '}
                {preview.balance_entries === 1 ? 'asiento' : 'asientos'}), así que no se puede
                borrar desde aquí: resuelve el saldo primero.
              </span>
            </p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="orphan-note">Motivo (opcional)</Label>
            <Input
              id="orphan-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Por qué se mantiene sin pago asociado"
            />
            <p className="text-xs text-muted-foreground">
              Si la mantienes, queda registrado que <span className="font-medium">{who}</span> lo
              aceptó, con la fecha y este motivo.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => onDecide('KEEP', note.trim() || null)}
              disabled={submitting}
            >
              <Unlink className="h-4 w-4" />
              Mantener operación
            </Button>
            <Button
              variant="destructive"
              onClick={() => onDecide('DELETE_OPERATION', note.trim() || null)}
              disabled={submitting || !canDelete}
            >
              <Trash2 className="h-4 w-4" />
              Borrar operación
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
