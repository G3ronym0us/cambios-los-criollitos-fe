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
import { cn } from '@/lib/utils';
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
  const [choice, setChoice] = useState<OrphanAction>('KEEP');

  useEffect(() => {
    if (preview) {
      setNote('');
      setChoice('KEEP'); // la salida reversible es la que viene marcada
    }
  }, [preview]);

  const op = preview?.operation ?? null;
  if (!preview?.would_orphan || !op) return null;

  const canDelete = preview.can_delete !== false;
  const movements = preview.fund_movements ?? [];
  const who = user?.full_name || user?.username || 'tu usuario';
  const deleting = choice === 'DELETE_OPERATION';

  return (
    <Dialog open onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex gap-3">
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
            >
              <AlertTriangle className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <DialogTitle>Esta operación quedaría sin ningún comprobante</DialogTitle>
              <DialogDescription className="text-pretty">
                Es el único pago vinculado a{' '}
                <span className="font-medium text-foreground">
                  {op.pair_symbol ?? ''} · {formatNumber(op.from_amount)} {op.from_currency ?? ''} →{' '}
                  {formatNumber(op.to_amount)} {op.to_currency ?? ''}
                </span>
                {op.status === 'COMPLETED'
                  ? ' — y estando completada ya no puede cambiar de estado'
                  : ''}
                . Decide qué pasa con ella.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Radio y un solo botón de confirmar: con las dos acciones como botones rivales en
            el pie, borrar quedaba a un clic de distancia igual que mantener. */}
        <div className="space-y-2" role="radiogroup" aria-label="Qué hacer con la operación">
          <button
            type="button"
            role="radio"
            aria-checked={!deleting}
            onClick={() => setChoice('KEEP')}
            className={cn(
              'flex w-full items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors',
              !deleting ? 'border-primary ring-3 ring-primary/10' : 'border-border hover:bg-muted/50',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'mt-0.5 h-4 w-4 shrink-0 rounded-full border-2',
                !deleting ? 'border-primary border-[5px]' : 'border-border',
              )}
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">
                Mantener la operación sin pago
              </span>
              <span className="block text-xs text-muted-foreground">
                Queda registrada y su transacción intacta; podrás vincular otro comprobante.
              </span>
            </span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={deleting}
            onClick={() => canDelete && setChoice('DELETE_OPERATION')}
            disabled={!canDelete}
            className={cn(
              'flex w-full items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors disabled:opacity-60',
              deleting ? 'border-destructive ring-3 ring-destructive/10' : 'border-destructive/30 hover:bg-muted/50',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'mt-0.5 h-4 w-4 shrink-0 rounded-full border-2',
                deleting ? 'border-destructive border-[5px]' : 'border-border',
              )}
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-destructive">
                Borrar la operación y su transacción
              </span>
              <span className="block text-xs text-muted-foreground">
                Se revierte el movimiento del fondo. No se puede deshacer.
              </span>
            </span>
          </button>
        </div>

        {/* Qué se lleva por delante: solo cuando esa es la salida elegida. */}
        {deleting ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Trash2 className="h-3.5 w-3.5 shrink-0 text-destructive" />
              Se va también:
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
        ) : null}

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
          <Label htmlFor="orphan-note">Nota para el historial (opcional)</Label>
          <Input
            id="orphan-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej.: el cliente canceló el cambio"
          />
          {!deleting ? (
            <p className="text-xs text-muted-foreground">
              Queda registrado que <span className="font-medium">{who}</span> aceptó dejarla sin
              pago, con la fecha y esta nota.
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            variant={deleting ? 'destructive' : 'default'}
            onClick={() => onDecide(choice, note.trim() || null)}
            disabled={submitting || (deleting && !canDelete)}
          >
            {deleting ? <Trash2 className="h-4 w-4" /> : <Unlink className="h-4 w-4" />}
            {submitting
              ? 'Guardando…'
              : deleting
                ? 'Desvincular y borrar'
                : 'Desvincular y mantener'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
