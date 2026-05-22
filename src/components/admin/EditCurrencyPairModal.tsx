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
import type { CurrencyPairData, UpdateCurrencyPairData } from '@/types/admin';

interface EditCurrencyPairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: UpdateCurrencyPairData) => Promise<void>;
  editingPair: CurrencyPairData | null;
  basePairs: CurrencyPairData[];
  error: string;
  setError: (error: string) => void;
  validateBinanceForm: (formData: CurrencyPairFormData) => Promise<boolean>;
  getFiatCurrencyFromPair: (fromCurrencyUuid: string, toCurrencyUuid: string) => string | null;
}

export default function EditCurrencyPairModal({
  isOpen,
  onClose,
  onSubmit,
  editingPair,
  basePairs,
  error,
  setError,
  validateBinanceForm,
  getFiatCurrencyFromPair,
}: EditCurrencyPairModalProps) {
  const open = isOpen && !!editingPair;

  const handleSubmit = async (data: CurrencyPairFormData) => {
    const {
      from_currency_uuid: _from,
      to_currency_uuid: _to,
      ...updateData
    } = data;
    void _from;
    void _to;
    await onSubmit(updateData);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle>Editar par de monedas</DialogTitle>
          <DialogDescription>
            Ajusta la configuración del par sin modificar las monedas involucradas.
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-4 flex-1 overflow-y-auto px-4">
          {editingPair ? (
            <CurrencyPairForm
              key={editingPair.uuid}
              mode="edit"
              editingPair={editingPair}
              currencies={[]}
              basePairs={basePairs}
              error={error}
              setError={setError}
              validateBinanceForm={validateBinanceForm}
              getFiatCurrencyFromPair={getFiatCurrencyFromPair}
              onSubmit={handleSubmit}
              onCancel={onClose}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
