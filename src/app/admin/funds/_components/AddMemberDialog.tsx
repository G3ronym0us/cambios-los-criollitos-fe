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
import { Switch } from '@/components/ui/switch';
import type { CommissionUserResponse } from '@/types/user';
import type { AddFundMember } from '@/types/fund';
import type { ClientData } from '@/types/client';

interface AddMemberDialogProps {
  open: boolean;
  value: AddFundMember;
  availableUsers: CommissionUserResponse[];
  availableClients: ClientData[];
  error: string;
  submitting: boolean;
  onChange: (value: AddFundMember) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const onlyDigits = (s: string) => s.replace(/\D/g, '');

export function AddMemberDialog({
  open,
  value,
  availableUsers,
  availableClients,
  error,
  submitting,
  onChange,
  onSubmit,
  onCancel,
}: AddMemberDialogProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  // El Select de clientes refleja el cliente cuyo teléfono coincide con el número actual.
  const phoneDigits = onlyDigits(value.whatsapp_phone ?? '');
  const selectedClient =
    phoneDigits !== ''
      ? availableClients.find((c) => onlyDigits(c.phone) === phoneDigits)
      : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar miembro al grupo</DialogTitle>
          <DialogDescription>
            Selecciona un usuario y decide si será gestor de fondos.
          </DialogDescription>
        </DialogHeader>

        <form id="add-member-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="member-user">
              Usuario <span className="text-destructive">*</span>
            </Label>
            <Select
              value={value.user_uuid || ''}
              onValueChange={(next) => onChange({ ...value, user_uuid: next as string })}
            >
              <SelectTrigger id="member-user" className="h-10 w-full">
                <SelectValue placeholder="Seleccionar usuario..." />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((u) => (
                  <SelectItem key={u.uuid} value={u.uuid}>
                    {u.full_name || u.username} — {u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">Gestor de fondos</p>
              <p className="text-xs text-muted-foreground">
                Puede registrar movimientos en este grupo.
              </p>
            </div>
            <Switch
              checked={!!value.is_fund_manager}
              onCheckedChange={(checked) => onChange({ ...value, is_fund_manager: checked })}
            />
          </label>

          <div className="space-y-1.5">
            <Label htmlFor="member-whatsapp">Número de WhatsApp del socio</Label>

            {availableClients.length > 0 ? (
              <Select
                value={selectedClient?.uuid ?? ''}
                onValueChange={(uuid) => {
                  const client = availableClients.find((c) => c.uuid === uuid);
                  if (client) onChange({ ...value, whatsapp_phone: onlyDigits(client.phone) });
                }}
              >
                <SelectTrigger id="member-client" className="h-10 w-full">
                  <SelectValue placeholder="Elegir de la lista de clientes..." />
                </SelectTrigger>
                <SelectContent>
                  {availableClients.map((c) => (
                    <SelectItem key={c.uuid} value={c.uuid}>
                      {c.display_name ? `${c.display_name} — ${c.phone}` : c.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            <Input
              id="member-whatsapp"
              value={value.whatsapp_phone ?? ''}
              onChange={(e) =>
                onChange({ ...value, whatsapp_phone: e.target.value ? onlyDigits(e.target.value) : null })
              }
              placeholder="Ej: 584240000001"
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              Opcional. Elígelo de la lista de clientes o escríbelo. Si se define, el bot detecta automáticamente los cambios reportados por este socio (escenario vía socio).
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
          <Button type="submit" form="add-member-form" disabled={submitting}>
            {submitting ? 'Agregando...' : 'Agregar miembro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
