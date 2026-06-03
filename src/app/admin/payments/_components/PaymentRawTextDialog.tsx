'use client';

import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [payment]);

  const handleCopy = async () => {
    if (!payment?.raw_text) return;
    try {
      await navigator.clipboard.writeText(payment.raw_text);
      setCopied(true);
      toast.success('Texto copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar el texto');
    }
  };

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
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle>Texto del comprobante</DialogTitle>
              <DialogDescription>
                {client}
                {amount ? ` · ${amount}` : ''}
              </DialogDescription>
            </div>
            {payment?.raw_text ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            ) : null}
          </div>
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
