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
import type { FundGroup, UpdateFundGroup } from '@/types/fund';

interface EditGroupDialogProps {
  open: boolean;
  group: FundGroup | null;
  value: UpdateFundGroup;
  error: string;
  submitting: boolean;
  onChange: (value: UpdateFundGroup) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function EditGroupDialog({
  open,
  group,
  value,
  error,
  submitting,
  onChange,
  onSubmit,
  onCancel,
}: EditGroupDialogProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar grupo</DialogTitle>
          <DialogDescription>
            {group?.name ? `Configura el grupo ${group.name}.` : 'Configura el grupo.'}
          </DialogDescription>
        </DialogHeader>

        <form id="edit-group-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-group-jid">JID del grupo de WhatsApp</Label>
            <Input
              id="edit-group-jid"
              type="text"
              value={value.whatsapp_group_jid ?? ''}
              onChange={(e) => onChange({ ...value, whatsapp_group_jid: e.target.value || null })}
              placeholder="Ej: 123456789-987654321@g.us"
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              Liga este fondo al grupo de WhatsApp donde subes los comprobantes (debe terminar en
              <span className="font-mono"> @g.us</span>). Vacío = sin grupo ligado.
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
          <Button type="submit" form="edit-group-form" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
