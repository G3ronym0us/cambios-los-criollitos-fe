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

interface AddMemberDialogProps {
  open: boolean;
  value: AddFundMember;
  availableUsers: CommissionUserResponse[];
  error: string;
  submitting: boolean;
  onChange: (value: AddFundMember) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function AddMemberDialog({
  open,
  value,
  availableUsers,
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
