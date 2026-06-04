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
import type { FundGroupMemberFlat, UpdateFundMember } from '@/types/fund';
import type { ClientData } from '@/types/client';

interface EditMemberDialogProps {
  open: boolean;
  member: FundGroupMemberFlat | null;
  value: UpdateFundMember;
  availableClients: ClientData[];
  error: string;
  submitting: boolean;
  onChange: (value: UpdateFundMember) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const onlyDigits = (s: string) => s.replace(/\D/g, '');

export function EditMemberDialog({
  open,
  member,
  value,
  availableClients,
  error,
  submitting,
  onChange,
  onSubmit,
  onCancel,
}: EditMemberDialogProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

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
          <DialogTitle>Editar miembro</DialogTitle>
          <DialogDescription>
            {member?.username ? `Configura a ${member.username} en este grupo.` : 'Configura el miembro.'}
          </DialogDescription>
        </DialogHeader>

        <form id="edit-member-form" onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="edit-member-whatsapp">Número de WhatsApp del socio</Label>

            {availableClients.length > 0 ? (
              <Select
                value={selectedClient?.uuid ?? ''}
                onValueChange={(uuid) => {
                  const client = availableClients.find((c) => c.uuid === uuid);
                  if (client) onChange({ ...value, whatsapp_phone: onlyDigits(client.phone) });
                }}
              >
                <SelectTrigger id="edit-member-client" className="h-10 w-full">
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
              id="edit-member-whatsapp"
              value={value.whatsapp_phone ?? ''}
              onChange={(e) =>
                onChange({ ...value, whatsapp_phone: e.target.value ? onlyDigits(e.target.value) : null })
              }
              placeholder="Ej: 584240000001"
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              Elígelo de la lista de clientes o escríbelo. Vacío = sin número (se desactiva la detección
              automática del socio). Si se define, el bot detecta sus cambios (escenario vía socio).
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
          <Button type="submit" form="edit-member-form" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
