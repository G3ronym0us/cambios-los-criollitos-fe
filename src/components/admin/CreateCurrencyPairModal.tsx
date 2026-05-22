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

interface CreateCurrencyPairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: CreateCurrencyPairData) => Promise<void>;
  currencies: CurrencyData[];
  basePairs: CurrencyPairData[];
  error: string;
  setError: (error: string) => void;
  validateBinanceForm: (formData: CurrencyPairFormData) => Promise<boolean>;
  getFiatCurrencyFromPair: (fromCurrencyUuid: string, toCurrencyUuid: string) => string | null;
}

export default function CreateCurrencyPairModal({
  isOpen,
  onClose,
  onSubmit,
  currencies,
  basePairs,
  error,
  setError,
  validateBinanceForm,
  getFiatCurrencyFromPair,
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
          <DialogTitle>Nuevo par de monedas</DialogTitle>
          <DialogDescription>
            Configura un nuevo par para conversión y rastreo de tasas.
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-4 flex-1 overflow-y-auto px-4">
          {isOpen ? (
            <CurrencyPairForm
              mode="create"
              currencies={currencies}
              basePairs={basePairs}
              error={error}
              setError={setError}
              validateBinanceForm={validateBinanceForm}
              getFiatCurrencyFromPair={getFiatCurrencyFromPair}
              onSubmit={onSubmit}
              onCancel={onClose}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
