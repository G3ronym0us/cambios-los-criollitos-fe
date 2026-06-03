'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatNumber } from '@/utils/functions';
import type { PaymentData } from '@/types/payment';

interface PaymentRawTextDialogProps {
  payment: PaymentData | null;
  onClose: () => void;
}

function stripPhone(phone: string | null) {
  return (phone || '').replace(/@(c|g)\.us$/, '');
}

export function PaymentRawTextDialog({ payment, onClose }: PaymentRawTextDialogProps) {
  const client = payment
    ? payment.client_name || stripPhone(payment.client_phone) || 'Sin identificar'
    : '';
  const amount =
    payment && payment.amount != null
      ? `${formatNumber(payment.amount)} ${payment.currency || ''}`.trim()
      : null;

  return (
    <Dialog open={payment !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Texto del comprobante</DialogTitle>
          <DialogDescription>
            {client}
            {amount ? ` · ${amount}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          {payment?.raw_text ? (
            <pre className="max-h-[60vh] whitespace-pre-wrap break-words rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground">
              {payment.raw_text}
            </pre>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Este pago no tiene texto OCR registrado.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
