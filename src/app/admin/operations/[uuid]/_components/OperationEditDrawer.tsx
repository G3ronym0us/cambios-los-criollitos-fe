'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getStatusMeta } from '@/utils/operationStatus';
import type { CurrencyPairData } from '@/types/admin';
import type { OperationData, OperationStatus } from '@/types/operation';

const STATUS_OPTIONS: OperationStatus[] = ['QUOTED', 'PENDING', 'COMPLETED', 'CANCELLED'];

interface OperationEditDrawerProps {
  open: boolean;
  operation: OperationData;
  pairs: CurrencyPairData[];
  pairsLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    currencyPairUuid: string,
    appliedPercentage: number | null,
    status: OperationStatus,
  ) => Promise<{ success: boolean; error?: string }>;
}

function getStatusHelp(status: OperationStatus) {
  switch (status) {
    case 'COMPLETED':
      return 'Al completar se genera la transacción contable de la operación.';
    case 'CANCELLED':
      return 'La operación dejará de aparecer entre las operaciones activas.';
    case 'PENDING':
      return 'La operación queda en curso, esperando el pago saliente o una acción manual.';
    case 'QUOTED':
    default:
      return 'La operación vuelve a cotizada y se renueva su tiempo de vigencia.';
  }
}

export function OperationEditDrawer({
  open,
  operation,
  pairs,
  pairsLoading,
  onOpenChange,
  onSave,
}: OperationEditDrawerProps) {
  const [pairUuid, setPairUuid] = useState(operation.currency_pair_uuid ?? '');
  const [margin, setMargin] = useState(operation.applied_percentage?.toString() ?? '');
  const [status, setStatus] = useState<OperationStatus>(operation.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPairUuid(operation.currency_pair_uuid ?? '');
    setMargin(operation.applied_percentage?.toString() ?? '');
    setStatus(operation.status);
    setError(null);
  }, [open, operation.applied_percentage, operation.currency_pair_uuid, operation.status]);

  const selectedPair = useMemo(
    () => pairs.find((pair) => pair.uuid === pairUuid),
    [pairUuid, pairs],
  );
  const statusOptions = operation.status === 'COMPLETED' ? ['COMPLETED' as const] : STATUS_OPTIONS;
  const parsedMargin = margin.trim() === '' ? null : Number(margin.replace(',', '.'));
  const marginIsValid = parsedMargin === null
    ? operation.applied_percentage === null
    : parsedMargin >= 0 && parsedMargin <= 99;
  const marginChanged = parsedMargin !== operation.applied_percentage;
  const hasChanges =
    pairUuid !== operation.currency_pair_uuid ||
    (operation.status !== 'COMPLETED' && marginChanged) ||
    status !== operation.status;

  const handleSave = async () => {
    if (!pairUuid || !hasChanges) return;
    if (!marginIsValid) {
      setError('Ingresa un margen entre 0% y 99%.');
      return;
    }
    setSaving(true);
    setError(null);
    const result = await onSave(pairUuid, parsedMargin, status);
    setSaving(false);

    if (result.success) {
      onOpenChange(false);
    } else {
      setError(result.error || 'No se pudieron guardar los cambios.');
    }
  };

  return (
    <Drawer open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DrawerContent className="sm:max-w-md">
        <DrawerHeader>
          <DrawerTitle>Editar operación</DrawerTitle>
          <DrawerDescription>
            Corrige el par, el margen aplicado o el estado desde un solo lugar.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-5 overflow-y-auto py-1">
          <div className="space-y-1.5">
            <label htmlFor="edit-operation-pair" className="text-sm font-medium text-foreground">
              Par
            </label>
            <Select
              value={pairUuid}
              onValueChange={(value) => setPairUuid(value ?? '')}
              disabled={saving}
            >
              <SelectTrigger id="edit-operation-pair" className="h-11 w-full">
                <SelectValue placeholder="Selecciona un par">
                  {selectedPair?.pair_symbol ?? operation.pair_symbol}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                {pairs.map((pair) => (
                  <SelectItem
                    key={pair.uuid}
                    value={pair.uuid}
                    disabled={!pair.is_active && pair.uuid !== operation.currency_pair_uuid}
                  >
                    {pair.pair_symbol}{pair.is_active ? '' : ' · Inactivo'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">
              Cambiar el par conserva los montos, la tasa y los pagos registrados.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-operation-margin" className="text-sm font-medium text-foreground">
              Margen aplicado
            </label>
            <div className="relative">
              <Input
                id="edit-operation-margin"
                className="h-11 pr-9"
                type="text"
                inputMode="decimal"
                value={margin}
                onChange={(event) => setMargin(event.target.value)}
                disabled={saving || operation.status === 'COMPLETED'}
                aria-invalid={!marginIsValid}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                %
              </span>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              {operation.status === 'COMPLETED'
                ? 'El margen queda bloqueado porque la transacción contable ya fue generada.'
                : operation.amount_side === 'RECEIVE'
                  ? 'Conserva el monto a recibir y recalcula la tasa y el monto a enviar.'
                  : 'Conserva el monto a enviar y recalcula la tasa y el monto a recibir.'}
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-operation-status" className="text-sm font-medium text-foreground">
              Estado
            </label>
            <Select
              value={status}
              onValueChange={(value) => value && setStatus(value as OperationStatus)}
              disabled={saving || operation.status === 'COMPLETED'}
            >
              <SelectTrigger id="edit-operation-status" className="h-11 w-full">
                <SelectValue>{getStatusMeta(status).label}</SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                {statusOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {getStatusMeta(option).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">
              {operation.status === 'COMPLETED'
                ? 'El estado completado es definitivo porque ya existe una transacción contable.'
                : getStatusHelp(status)}
            </p>
          </div>

          {error ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DrawerFooter>
          <Button
            variant="ghost"
            className="min-h-11"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            variant={status === 'CANCELLED' ? 'destructive' : 'default'}
            className="min-h-11"
            onClick={handleSave}
            disabled={saving || pairsLoading || !pairUuid || !marginIsValid || !hasChanges}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
