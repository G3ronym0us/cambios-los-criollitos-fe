'use client';

import { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, SlidersHorizontal, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCaracasDateTime } from '@/utils/functions';
import type { BalanceAdjust, BalanceEntry, BalanceSummary } from '@/types/client';

interface ClientBalanceTabProps {
  balance: BalanceSummary | null;
  loading: boolean;
  onAdjust: (data: BalanceAdjust) => Promise<boolean>;
}

function formatUsd(value: number) {
  return `$${value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Fecha+hora en hora de Venezuela (el timestamp viene en UTC del backend).
function formatDateTime(value: string) {
  return formatCaracasDateTime(value);
}

function EntryRow({ entry }: { entry: BalanceEntry }) {
  const isCredit = entry.entry_type === 'CREDIT';
  return (
    <div className="flex items-start gap-3 py-3">
      <span
        aria-hidden
        className={`mt-0.5 shrink-0 ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}
      >
        {isCredit ? <ArrowDownCircle className="h-5 w-5" /> : <ArrowUpCircle className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">
          {isCredit ? 'Crédito' : 'Abono'}
          {entry.incoming_payment_id != null ? ` · pago entrante #${entry.incoming_payment_id}` : ''}
          {entry.operation_uuid ? ` · op ${entry.operation_uuid.substring(0, 8)}` : ''}
        </p>
        {!isCredit && entry.operation_rate_used != null && entry.operation_to_amount != null ? (
          <p className="text-xs text-muted-foreground">
            @ {entry.operation_rate_used.toLocaleString('es-VE', { maximumFractionDigits: 4 })} →{' '}
            {entry.operation_to_amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
          </p>
        ) : null}
        {entry.notes ? <p className="text-xs text-muted-foreground">{entry.notes}</p> : null}
        <p className="text-xs text-muted-foreground">
          {formatDateTime(entry.created_at)}
          {entry.created_by_username ? ` · ${entry.created_by_username}` : ''}
        </p>
      </div>
      <span
        className={`shrink-0 text-sm font-semibold ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}
      >
        {isCredit ? '+' : '−'}{formatUsd(entry.amount)}
      </span>
    </div>
  );
}

export function ClientBalanceTab({ balance, loading, onAdjust }: ClientBalanceTabProps) {
  const [open, setOpen] = useState(false);
  const [entryType, setEntryType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <LoadingState label="Cargando saldo..." />;

  const total = balance?.balance ?? 0;
  const entries = balance?.entries ?? [];

  const submit = async () => {
    const amt = parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(amt) || amt <= 0) return toast.error('El monto debe ser mayor a 0');

    setSubmitting(true);
    const ok = await onAdjust({ entry_type: entryType, amount: amt, notes: notes.trim() || null });
    setSubmitting(false);
    if (ok) {
      setOpen(false);
      setAmount('');
      setNotes('');
      setEntryType('CREDIT');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            >
              <Wallet className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Saldo a favor</p>
              <p className="text-2xl font-bold text-foreground">{formatUsd(total)} <span className="text-sm font-medium text-muted-foreground">USD</span></p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" />
            Ajustar saldo
          </Button>
        </CardContent>
      </Card>

      {entries.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Sin movimientos"
          description="El cliente no tiene créditos ni abonos registrados. Acredita un pago entrante desde Pagos, o usa Ajustar saldo."
        />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-4 sm:p-6">
            {entries.map((entry) => (
              <EntryRow key={entry.uuid} entry={entry} />
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar saldo a favor</DialogTitle>
            <DialogDescription>
              Crédito suma al saldo (el cliente dejó plata en cuenta); débito lo descuenta (corrección o abono manual).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="balance-type">Tipo</Label>
              <Select value={entryType} onValueChange={(v) => setEntryType((v as 'CREDIT' | 'DEBIT') ?? 'CREDIT')}>
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
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? 'Guardando…' : 'Guardar ajuste'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
