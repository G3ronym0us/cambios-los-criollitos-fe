'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import type { BalanceAdjust } from '@/types/client';

interface BalanceAdjustDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdjust: (data: BalanceAdjust) => Promise<boolean>;
}

/** Ajuste manual del saldo a favor. Sale de la antigua pestaña Saldo, que ahora es un filtro. */
export function BalanceAdjustDialog({ open, onOpenChange, onAdjust }: BalanceAdjustDialogProps) {
  const [entryType, setEntryType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const amt = parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(amt) || amt <= 0) return toast.error('El monto debe ser mayor a 0');

    setSubmitting(true);
    const ok = await onAdjust({ entry_type: entryType, amount: amt, notes: notes.trim() || null });
    setSubmitting(false);
    if (ok) {
      onOpenChange(false);
      setAmount('');
      setNotes('');
      setEntryType('CREDIT');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar saldo a favor</DialogTitle>
          <DialogDescription>
            Crédito suma al saldo (el cliente dejó plata en cuenta); débito lo descuenta
            (corrección o abono manual).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="balance-type">Tipo</Label>
            <Select
              value={entryType}
              onValueChange={(v) => setEntryType((v as 'CREDIT' | 'DEBIT') ?? 'CREDIT')}
            >
              <SelectTrigger id="balance-type" className="h-10 w-full">
                <SelectValue>{entryType === 'CREDIT' ? 'Crédito (+)' : 'Débito (−)'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CREDIT">Crédito (+)</SelectItem>
                <SelectItem value="DEBIT">Débito (−)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="balance-amount">Monto (USD)</Label>
            <Input
              id="balance-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="balance-notes">Nota (opcional)</Label>
            <Textarea
              id="balance-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo del ajuste"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Guardando…' : 'Guardar ajuste'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
