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
import { Switch } from '@/components/ui/switch';
import type { FundGroupMemberFlat, UpdateFundMember } from '@/types/fund';

interface EditMemberDialogProps {
  open: boolean;
  member: FundGroupMemberFlat | null;
  value: UpdateFundMember;
  error: string;
  submitting: boolean;
  onChange: (value: UpdateFundMember) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function EditMemberDialog({
  open,
  member,
  value,
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

          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
            <p className="text-sm font-medium text-foreground">WhatsApp del socio</p>
            {member?.whatsapp_phone ? (
              <p className="font-mono text-sm text-foreground">{member.whatsapp_phone}</p>
            ) : (
              <p className="text-xs text-amber-600 dark:text-amber-400">Sin número definido.</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Es el número que el usuario tiene en su perfil. Para cambiarlo, edítalo en la
              pantalla de Usuarios.
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
