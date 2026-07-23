'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRightLeft, ChevronRight, Link2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
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
import { paymentService } from '@/services/paymentService';
import type { PaymentData } from '@/types/payment';
import { LinkOperationPanel } from './LinkOperationPanel';

interface IncomingPaymentActionDialogProps {
  payment: PaymentData | null;
  onClose: () => void;
  onDone: () => void;
  onConverted: (payment: PaymentData) => void;
}

type Step = 'choose' | 'operation' | 'balance';

// Métodos que liquidan en USD: los únicos que el backend acepta como crédito de saldo.
const BALANCE_CURRENCIES = new Set(['USD', 'ZELLE', 'PAYPAL']);

export function IncomingPaymentActionDialog({ payment, onClose, onDone, onConverted }: IncomingPaymentActionDialogProps) {
  const [step, setStep] = useState<Step>('choose');
  const [submitting, setSubmitting] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceNotes, setBalanceNotes] = useState('');

  useEffect(() => {
    if (!payment) return;
    setStep('choose');
    setSubmitting(false);
    setBalanceAmount(payment.amount != null ? String(payment.amount) : '');
    setBalanceNotes('');
  }, [payment]);

  if (!payment) return null;

  const isLinked = !!payment.operation_uuid;

  const finish = () => {
    onDone();
    onClose();
  };

  const saveBalanceCredit = async () => {
    const amt = parseFloat(balanceAmount.replace(',', '.'));
    if (!Number.isFinite(amt) || amt <= 0) return toast.error('El monto debe ser mayor a 0');

    setSubmitting(true);
    const res = await paymentService.creditBalance(payment.id, {
      amount: amt,
      notes: balanceNotes.trim() || null,
    });
    setSubmitting(false);
    if (res.success) {
      toast.success('Pago acreditado como saldo a favor del cliente');
      finish();
    } else {
      toast.error(res.error || 'No se pudo acreditar el saldo');
    }
  };

  const convertToOutgoing = async () => {
    setSubmitting(true);
    const res = await paymentService.convertToOutgoing(payment.id);
    setSubmitting(false);
    if (res.success && res.data) {
      toast.success('Pago convertido en saliente');
      onConverted(res.data);
      onClose();
    } else {
      toast.error(res.error || 'No se pudo convertir el pago en saliente');
    }
  };

  const balanceEligible = BALANCE_CURRENCIES.has((payment.currency || '').toUpperCase());
  
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        {step === 'choose' ? (
          <>
            <DialogHeader>
              <DialogTitle>¿Qué quieres hacer con este pago?</DialogTitle>
              <DialogDescription>
                Vincúlalo a una operación, acredítalo como saldo o devuélvelo a salientes.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setStep('operation')}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
                  isLinked ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                }`}
              >
                <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Link2 className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">Vincular a una operación</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {isLinked ? 'Ya vinculada — ábrela para ver o cambiar la operación.' : 'Asociar el pago a una cotización del cliente.'}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
              {balanceEligible ? (
                <button
                  type="button"
                  onClick={() => setStep('balance')}
                  className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Wallet className="h-4.5 w-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">Acreditar como saldo a favor</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      El cliente deja el dinero en cuenta y se le paga en abonos a la tasa del día.
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={convertToOutgoing}
                disabled={submitting}
                className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-3 text-left transition-colors hover:bg-muted/50 disabled:opacity-60"
              >
                <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <ArrowRightLeft className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">Convertir en pago saliente</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    Devuélvelo a Salientes si fue clasificado como entrante por error.
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
            </DialogFooter>
          </>
        ) : step === 'operation' ? (
          <>
            <DialogHeader>
              <DialogTitle>Vincular a operación</DialogTitle>
              <DialogDescription>
                Elige la cotización a la que pertenece este pago. Busca por cliente, par, monto o ID.
              </DialogDescription>
            </DialogHeader>
            <LinkOperationPanel
              payment={payment}
              table="incoming"
              onSuccess={finish}
              onCancel={() => setStep('choose')}
              cancelLabel="Volver"
            />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Acreditar como saldo a favor</DialogTitle>
              <DialogDescription>
                Suma el monto al saldo del cliente. Cada abono posterior se cotiza a la tasa del día y lo descuenta.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 overflow-y-auto">
              <div className="space-y-1.5">
                <Label htmlFor="balance-amount">Monto (USD)</Label>
                <Input
                  id="balance-amount"
                  inputMode="decimal"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="balance-notes">Nota (opcional)</Label>
                <Input
                  id="balance-notes"
                  value={balanceNotes}
                  onChange={(e) => setBalanceNotes(e.target.value)}
                  placeholder="Ej.: pagos parciales acordados con el cliente"
                  className="h-10"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="ghost" onClick={() => setStep('choose')} disabled={submitting}>
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <Button onClick={saveBalanceCredit} disabled={submitting}>
                <Wallet className="h-4 w-4" />
                {submitting ? 'Guardando…' : 'Acreditar saldo'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
