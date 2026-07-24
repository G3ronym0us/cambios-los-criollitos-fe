'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PaymentData, PaymentTable } from '@/types/payment';
import { LinkOperationPanel } from './LinkOperationPanel';

interface LinkOperationDialogProps {
  payment: PaymentData | null;
  table: PaymentTable;
  onClose: () => void;
  onLinked: () => void;
}

export function LinkOperationDialog({ payment, table, onClose, onLinked }: LinkOperationDialogProps) {
  return (
    <Dialog open={payment !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Vincular a operación</DialogTitle>
          <DialogDescription>
            Elige la cotización a la que pertenece este pago. Busca por cliente, par, monto o ID.
          </DialogDescription>
        </DialogHeader>

        {payment ? (
          <LinkOperationPanel
            payment={payment}
            table={table}
            onSuccess={() => {
              onLinked();
              onClose();
            }}
            onCancel={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
