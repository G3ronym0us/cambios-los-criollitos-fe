'use client';

import { useEffect } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CommissionUserResponse, UserData, UserUpdate } from '@/types/user';
import type { ClientData } from '@/types/client';
import { WhatsappNumberField } from './WhatsappNumberField';

interface UserEditDialogProps {
  user: UserData | null;
  submitting: boolean;
  contacts: ClientData[];
  users: CommissionUserResponse[];
  onSubmit: (data: UserUpdate) => void;
  onCancel: () => void;
}

const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

type EditFormValues = {
  full_name: string;
  email: string;
  phone_number: string;
  bio: string;
  role: string;
  preferred_settlement_currency: string;
  is_active: boolean;
  is_fund_manager: boolean;
};

function buildDefaults(user: UserData | null): EditFormValues {
  return {
    full_name: user?.full_name ?? '',
    email: user?.email ?? '',
    phone_number: user?.phone_number ?? '',
    bio: user?.bio ?? '',
    role: (user?.role || '').toLowerCase(),
    preferred_settlement_currency: user?.preferred_settlement_currency ?? '',
    is_active: user?.is_active ?? true,
    is_fund_manager: user?.is_fund_manager ?? false,
  };
}

export function UserEditDialog({
  user,
  submitting,
  contacts,
  users,
  onSubmit,
  onCancel,
}: UserEditDialogProps) {
  const open = !!user;
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditFormValues>({
    defaultValues: buildDefaults(user),
  });

  useEffect(() => {
    reset(buildDefaults(user));
  }, [user, reset]);

  if (!user) return null;

  const role = watch('role');
  const preferred = watch('preferred_settlement_currency');
  const isActive = watch('is_active');
  const isFundManager = watch('is_fund_manager');

  const submit: SubmitHandler<EditFormValues> = (data) => {
    const cleanData: UserUpdate = {};
    if (data.full_name && data.full_name !== user.full_name) cleanData.full_name = data.full_name;
    if (data.email && data.email !== user.email) cleanData.email = data.email;
    if (
      data.role &&
      data.role.toLowerCase() !== (user.role || '').toLowerCase()
    ) {
      cleanData.role = data.role;
    }
    if (data.is_active !== user.is_active) cleanData.is_active = data.is_active;
    if ((data.phone_number || '') !== (user.phone_number || '')) {
      cleanData.phone_number = data.phone_number || null;
    }
    if (data.bio && data.bio !== user.bio) cleanData.bio = data.bio;
    if (
      data.preferred_settlement_currency !==
      (user.preferred_settlement_currency || '')
    ) {
      cleanData.preferred_settlement_currency =
        data.preferred_settlement_currency || null;
    }
    if (data.is_fund_manager !== (user.is_fund_manager ?? false)) {
      cleanData.is_fund_manager = data.is_fund_manager;
    }

    onSubmit(cleanData);
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
          <DialogTitle>Editar usuario</DialogTitle>
          <DialogDescription>
            {user.full_name || user.username} — @{user.username}
          </DialogDescription>
        </DialogHeader>

        <form id="user-edit-form" onSubmit={handleSubmit(submit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-full_name">Nombre completo</Label>
              <Input
                id="edit-full_name"
                type="text"
                className="h-10"
                {...register('full_name')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                className="h-10"
                {...register('email', {
                  pattern: { value: EMAIL_REGEX, message: 'Email inválido' },
                })}
              />
              {errors.email ? (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              ) : null}
            </div>
          </div>

          <WhatsappNumberField
            value={watch('phone_number') ?? ''}
            onChange={(digits) => setValue('phone_number', digits, { shouldDirty: true })}
            contacts={contacts}
            users={users}
            currentUserUuid={user.uuid}
          />
          <input type="hidden" {...register('phone_number')} />

          <div className="space-y-1.5">
            <Label htmlFor="edit-bio">Biografía</Label>
            <Textarea
              id="edit-bio"
              rows={3}
              placeholder="Información adicional sobre el usuario..."
              {...register('bio')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-role">Rol</Label>
              <Select
                value={role || ''}
                onValueChange={(value) => setValue('role', value as string)}
              >
                <SelectTrigger id="edit-role" className="h-10 w-full">
                  <SelectValue placeholder="Seleccionar rol..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="moderator">Moderador</SelectItem>
                  <SelectItem value="root">Administrador</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" {...register('role')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-currency">Moneda de liquidación preferida</Label>
              <Select
                value={preferred || '__none__'}
                onValueChange={(value) =>
                  setValue('preferred_settlement_currency', value === '__none__' ? '' : (value as string))
                }
              >
                <SelectTrigger id="edit-currency" className="h-10 w-full">
                  <SelectValue placeholder="Sin preferencia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin preferencia</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="USDT">USDT</SelectItem>
                  <SelectItem value="COP">COP</SelectItem>
                  <SelectItem value="VES">VES</SelectItem>
                  <SelectItem value="BRL">BRL</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" {...register('preferred_settlement_currency')} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">Activo</p>
                <p className="text-xs text-muted-foreground">Puede iniciar sesión.</p>
              </div>
              <Switch
                checked={!!isActive}
                onCheckedChange={(checked) => setValue('is_active', checked)}
              />
            </label>

            <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">Gestor de fondos</p>
                <p className="text-xs text-muted-foreground">Acceso a la sección de fondos.</p>
              </div>
              <Switch
                checked={!!isFundManager}
                onCheckedChange={(checked) => setValue('is_fund_manager', checked)}
              />
            </label>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form="user-edit-form" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
