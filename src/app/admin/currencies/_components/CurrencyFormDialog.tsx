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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyType, type CreateCurrencyData } from '@/types/admin';

type Mode = 'create' | 'edit';

interface CurrencyFormDialogProps {
  mode: Mode;
  open: boolean;
  value: CreateCurrencyData;
  submitting: boolean;
  onChange: (value: CreateCurrencyData) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const COPY: Record<Mode, { title: string; description: string; submit: string }> = {
  create: {
    title: 'Nueva moneda',
    description: 'Registra una nueva moneda disponible para pares y transacciones.',
    submit: 'Crear moneda',
  },
  edit: {
    title: 'Editar moneda',
    description: 'Actualiza los datos de esta moneda.',
    submit: 'Guardar cambios',
  },
};

export function CurrencyFormDialog({
  mode,
  open,
  value,
  submitting,
  onChange,
  onSubmit,
  onCancel,
}: CurrencyFormDialogProps) {
  const copy = COPY[mode];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <form id="currency-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="currency-name">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="currency-name"
              type="text"
              value={value.name}
              onChange={(e) => onChange({ ...value, name: e.target.value })}
              placeholder="Bolívares, Dólares, USDT..."
              autoFocus
              required
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="currency-symbol">
              Código / Símbolo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="currency-symbol"
              type="text"
              value={value.symbol}
              onChange={(e) => onChange({ ...value, symbol: e.target.value.toUpperCase() })}
              placeholder="VES, USD, USDT..."
              required
              className="h-10 uppercase"
            />
            <p className="text-xs text-muted-foreground">
              Identificador único, normalmente 3-5 letras en mayúsculas.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="currency-description">
              Descripción <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="currency-description"
              value={value.description}
              onChange={(e) => onChange({ ...value, description: e.target.value })}
              placeholder="Breve descripción de la moneda"
              required
              rows={3}
            />
          </div>

          <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">Es criptomoneda</p>
              <p className="text-xs text-muted-foreground">
                Actívalo si la moneda es digital (BTC, USDT, ETH…).
              </p>
            </div>
            <Switch
              checked={value.currency_type === CurrencyType.CRYPTO}
              onCheckedChange={(checked) =>
                onChange({
                  ...value,
                  currency_type: checked ? CurrencyType.CRYPTO : CurrencyType.FIAT,
                })
              }
            />
          </label>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form="currency-form" disabled={submitting}>
            {submitting ? 'Guardando...' : copy.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
