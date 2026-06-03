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
import type { CurrencyData } from '@/types/admin';
import type { CreateFundGroup } from '@/types/fund';

interface CreateGroupDialogProps {
  open: boolean;
  value: CreateFundGroup;
  currencies: CurrencyData[];
  error: string;
  submitting: boolean;
  onChange: (value: CreateFundGroup) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function CreateGroupDialog({
  open,
  value,
  currencies,
  error,
  submitting,
  onChange,
  onSubmit,
  onCancel,
}: CreateGroupDialogProps) {
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
          <DialogTitle>Nuevo grupo de fondos</DialogTitle>
          <DialogDescription>
            Crea un grupo para agrupar movimientos y posiciones de gestores.
          </DialogDescription>
        </DialogHeader>

        <form id="create-group-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="group-name">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="group-name"
              type="text"
              value={value.name}
              onChange={(e) => onChange({ ...value, name: e.target.value })}
              placeholder="Ej: Zelle/Paypal"
              autoFocus
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="group-currency">
              Moneda <span className="text-destructive">*</span>
            </Label>
            <Select
              value={value.currency || ''}
              onValueChange={(next) => onChange({ ...value, currency: next as string })}
            >
              <SelectTrigger id="group-currency" className="h-10 w-full">
                <SelectValue placeholder="Seleccionar moneda..." />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.uuid} value={c.symbol}>
                    {c.symbol} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="group-description">Descripción</Label>
            <Textarea
              id="group-description"
              rows={2}
              value={value.description || ''}
              onChange={(e) => onChange({ ...value, description: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="group-jid">JID del grupo de WhatsApp</Label>
            <Input
              id="group-jid"
              type="text"
              value={value.whatsapp_group_jid ?? ''}
              onChange={(e) => onChange({ ...value, whatsapp_group_jid: e.target.value || null })}
              placeholder="Ej: 123456789-987654321@g.us"
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              Opcional. Permite ligar este fondo al grupo de WhatsApp donde reenvías los comprobantes.
            </p>
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
          <Button type="submit" form="create-group-form" disabled={submitting}>
            {submitting ? 'Creando...' : 'Crear grupo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
