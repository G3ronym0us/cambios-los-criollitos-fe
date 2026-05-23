'use client';

import type { FormEvent } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { CommissionUserResponse } from '@/types/user';
import {
  MovementType,
  type CreateFundMovement,
} from '@/types/fund';
import { MOVEMENT_LABELS } from './movementMeta';

type MovementDraft = Omit<CreateFundMovement, 'group_uuid'>;

interface RegisterMovementDialogProps {
  open: boolean;
  value: MovementDraft;
  availableUsers: CommissionUserResponse[];
  error: string;
  submitting: boolean;
  onChange: (value: MovementDraft) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const CURRENCY_OPTIONS = ['USD', 'USDT', 'COP', 'VES', 'BRL'];

export function RegisterMovementDialog({
  open,
  value,
  availableUsers,
  error,
  submitting,
  onChange,
  onSubmit,
  onCancel,
}: RegisterMovementDialogProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const handleAmountChange = (next: number) => {
    const rate = value.usdt_rate || 1;
    onChange({ ...value, amount: next, amount_usdt: next * rate });
  };

  const handleRateChange = (next: number) => {
    onChange({ ...value, usdt_rate: next, amount_usdt: value.amount * (next || 1) });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar movimiento</DialogTitle>
          <DialogDescription>
            Registra un depósito, cambio, salida personal o ajuste para el grupo.
          </DialogDescription>
        </DialogHeader>

        <form id="register-movement-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mov-user">
              Gestor <span className="text-destructive">*</span>
            </Label>
            <Select
              value={value.user_uuid || ''}
              onValueChange={(next) => onChange({ ...value, user_uuid: next as string })}
            >
              <SelectTrigger id="mov-user" className="h-10 w-full">
                <SelectValue placeholder="Seleccionar gestor..." />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((u) => (
                  <SelectItem key={u.uuid} value={u.uuid}>
                    {u.full_name || u.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mov-type">
              Tipo de movimiento <span className="text-destructive">*</span>
            </Label>
            <Select
              value={value.movement_type}
              onValueChange={(next) =>
                onChange({ ...value, movement_type: next as MovementType })
              }
            >
              <SelectTrigger id="mov-type" className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(MovementType).map((t) => (
                  <SelectItem key={t} value={t}>
                    {MOVEMENT_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mov-amount">
                Monto <span className="text-destructive">*</span>
              </Label>
              <Input
                id="mov-amount"
                type="number"
                step="0.01"
                min="0"
                value={value.amount || ''}
                onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mov-currency">Moneda</Label>
              <Select
                value={value.currency || 'USD'}
                onValueChange={(next) => onChange({ ...value, currency: next as string })}
              >
                <SelectTrigger id="mov-currency" className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mov-rate">Tasa USDT</Label>
              <Input
                id="mov-rate"
                type="number"
                step="0.0001"
                min="0"
                value={value.usdt_rate || ''}
                onChange={(e) => handleRateChange(parseFloat(e.target.value) || 1)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mov-usdt">Equiv. USDT</Label>
              <Input
                id="mov-usdt"
                type="number"
                step="0.01"
                value={value.amount_usdt || ''}
                onChange={(e) =>
                  onChange({ ...value, amount_usdt: parseFloat(e.target.value) || 0 })
                }
                className="h-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mov-date">
              Fecha y hora <span className="text-destructive">*</span>
            </Label>
            <Input
              id="mov-date"
              type="datetime-local"
              value={value.movement_date}
              onChange={(e) => onChange({ ...value, movement_date: e.target.value })}
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mov-notes">Notas</Label>
            <Textarea
              id="mov-notes"
              rows={2}
              value={value.notes || ''}
              onChange={(e) => onChange({ ...value, notes: e.target.value })}
              placeholder="Descripción opcional del movimiento..."
            />
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form="register-movement-form" disabled={submitting}>
            {submitting ? 'Registrando...' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
