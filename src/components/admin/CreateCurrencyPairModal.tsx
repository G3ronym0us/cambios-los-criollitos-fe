'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CurrencyPairForm,
  type CurrencyPairFormData,
} from '@/app/admin/currency-pairs/_components/CurrencyPairForm';
import type { CreateCurrencyPairData, CurrencyData, CurrencyPairData } from '@/types/admin';

export type { CurrencyPairFormData };

interface CreateCurrencyPairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: CreateCurrencyPairData) => Promise<void>;
  currencies: CurrencyData[];
  /** Todos los pares existentes: apagan las combinaciones de moneda ya ocupadas. */
  existingPairs: CurrencyPairData[];
  error: string;
  setError: (error: string) => void;
}

export default function CreateCurrencyPairModal({
  isOpen,
  onClose,
  onSubmit,
  currencies,
  existingPairs,
  error,
  setError,
}: CreateCurrencyPairModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle>Nuevo par</DialogTitle>
          <DialogDescription>
            Lo esencial ahora; USDT, redondeo y comisiones al terminar.
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-4 flex-1 overflow-y-auto px-4">
          {isOpen ? (
            <CurrencyPairForm
              currencies={currencies}
              existingPairs={existingPairs}
              error={error}
              setError={setError}
              onSubmit={onSubmit}
              onCancel={onClose}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
