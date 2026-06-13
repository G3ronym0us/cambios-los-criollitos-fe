'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Ban, ChevronRight, Link2, Tag, Wallet } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { paymentService } from '@/services/paymentService';
import type { PaymentData } from '@/types/payment';
import { LinkOperationPanel } from './LinkOperationPanel';

interface OutgoingPaymentActionDialogProps {
  payment: PaymentData | null;
  onClose: () => void;
  onDone: () => void;
}

type Step = 'choose' | 'personal' | 'irrelevant' | 'operation';

export function OutgoingPaymentActionDialog({ payment, onClose, onDone }: OutgoingPaymentActionDialogProps) {
  const [step, setStep] = useState<Step>('choose');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setStep('choose');
    setDesc('');
    setSubmitting(false);
  }, [payment]);

  if (!payment) return null;

  const isPersonal = !!payment.is_personal_expense;
  const isIrrelevant = !!payment.is_irrelevant;
  const current: Step = isPersonal ? 'personal' : isIrrelevant ? 'irrelevant' : 'operation';

  const finish = () => {
    onDone();
    onClose();
  };

  // Limpia la marca actual (si la hay) y pasa al selector de operaciones (revertir a operativo).
  const goOperation = async () => {
    if (isPersonal || isIrrelevant) {
      setSubmitting(true);
      const res = isPersonal
        ? await paymentService.markPersonalExpense(payment.id, false, null)
        : await paymentService.markIrrelevant(payment.id, false, null);
      setSubmitting(false);
      if (!res.success) {
        toast.error(res.error || 'No se pudo actualizar el pago');
        return;
      }
      onDone(); // refresca la lista en segundo plano; el diálogo sigue abierto
    }
    setStep('operation');
  };

  const savePersonal = async () => {
    const value = desc.trim();
    if (!value) {
      toast.error('La descripción del gasto personal es requerida');
      return;
    }
    setSubmitting(true);
    const res = await paymentService.markPersonalExpense(payment.id, true, value);
    setSubmitting(false);
    if (res.success) {
      toast.success('Pago marcado como gasto personal');
      finish();
    } else {
      toast.error(res.error || 'No se pudo marcar el gasto personal');
    }
  };

  const saveIrrelevant = async () => {
    setSubmitting(true);
    const res = await paymentService.markIrrelevant(payment.id, true, desc.trim() || null);
    setSubmitting(false);
    if (res.success) {
      toast.success('Pago marcado como irrelevante');
      finish();
    } else {
      toast.error(res.error || 'No se pudo marcar como irrelevante');
    }
  };

  const ChoiceButton = ({
    icon: Icon,
    title,
    description,
    active,
    onClick,
  }: {
    icon: typeof Link2;
    title: string;
    description: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={submitting}
      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors disabled:opacity-60 ${
        active ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
      }`}
    >
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{description}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        {step === 'choose' ? (
          <>
            <DialogHeader>
              <DialogTitle>¿Qué quieres hacer con este pago?</DialogTitle>
              <DialogDescription>
                Clasifica el pago saliente antes de vincularlo a una operación.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <ChoiceButton
                icon={Link2}
                title="Vincular a una operación"
                description="Asociar el pago a una cotización del cliente."
                active={current === 'operation'}
                onClick={goOperation}
              />
              <ChoiceButton
                icon={Wallet}
                title="Gasto personal"
                description="Pago propio del operador (requiere descripción)."
                active={current === 'personal'}
                onClick={() => {
                  setDesc(payment.personal_description ?? '');
                  setStep('personal');
                }}
              />
              <ChoiceButton
                icon={Ban}
                title="Irrelevante"
                description="No corresponde a ninguna operación (descripción opcional)."
                active={current === 'irrelevant'}
                onClick={() => {
                  setDesc(payment.irrelevant_description ?? '');
                  setStep('irrelevant');
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Cancelar
              </Button>
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
              table="outgoing"
              onSuccess={finish}
              onCancel={() => setStep('choose')}
              cancelLabel="Volver"
            />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {step === 'personal' ? 'Gasto personal' : 'Marcar como irrelevante'}
              </DialogTitle>
              <DialogDescription>
                {step === 'personal'
                  ? 'Describe el gasto personal. La descripción es requerida.'
                  : 'Puedes añadir una descripción opcional del motivo.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="payment-action-desc">
                Descripción {step === 'irrelevant' ? '(opcional)' : ''}
              </Label>
              <Textarea
                id="payment-action-desc"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder={
                  step === 'personal'
                    ? 'Ej: Pago de servicio personal, recarga, etc.'
                    : 'Ej: Comprobante duplicado, no corresponde…'
                }
                rows={3}
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="ghost" onClick={() => setStep('choose')} disabled={submitting}>
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <Button
                onClick={step === 'personal' ? savePersonal : saveIrrelevant}
                disabled={submitting || (step === 'personal' && desc.trim() === '')}
              >
                <Tag className="h-4 w-4" />
                {submitting ? 'Guardando…' : 'Guardar'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
