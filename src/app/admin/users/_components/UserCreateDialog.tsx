'use client';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { UserCreate } from '@/types/user';

interface UserCreateDialogProps {
  open: boolean;
  submitting: boolean;
  onSubmit: (data: UserCreate) => void;
  onCancel: () => void;
}

const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export function UserCreateDialog({
  open,
  submitting,
  onSubmit,
  onCancel,
}: UserCreateDialogProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UserCreate>({
    defaultValues: {
      username: '',
      email: '',
      full_name: '',
      password: '',
      role: '',
      is_active: true,
    },
  });

  const handleClose = () => {
    reset();
    onCancel();
  };

  const submit: SubmitHandler<UserCreate> = (data) => onSubmit(data);

  const isActive = watch('is_active');
  const role = watch('role');

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
          <DialogDescription>
            Registra un nuevo usuario con su rol y configuración inicial.
          </DialogDescription>
        </DialogHeader>

        <form id="user-create-form" onSubmit={handleSubmit(submit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="username">
                Usuario <span className="text-destructive">*</span>
              </Label>
              <Input
                id="username"
                type="text"
                className="h-10"
                autoFocus
                {...register('username', {
                  required: 'El usuario es requerido',
                  minLength: { value: 3, message: 'Mínimo 3 caracteres' },
                })}
              />
              {errors.username ? (
                <p className="text-xs text-destructive">{errors.username.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                className="h-10"
                {...register('email', {
                  required: 'El email es requerido',
                  pattern: { value: EMAIL_REGEX, message: 'Email inválido' },
                })}
              />
              {errors.email ? (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="full_name">
              Nombre completo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="full_name"
              type="text"
              className="h-10"
              {...register('full_name', { required: 'El nombre completo es requerido' })}
            />
            {errors.full_name ? (
              <p className="text-xs text-destructive">{errors.full_name.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="password">
                Contraseña <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                className="h-10"
                {...register('password', {
                  required: 'La contraseña es requerida',
                  minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                })}
              />
              {errors.password ? (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role">
                Rol <span className="text-destructive">*</span>
              </Label>
              <Select
                value={role || ''}
                onValueChange={(value) =>
                  setValue('role', value as string, { shouldValidate: true })
                }
              >
                <SelectTrigger id="role" className="h-10 w-full">
                  <SelectValue placeholder="Seleccionar rol..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="moderator">Moderador</SelectItem>
                  <SelectItem value="root">Administrador</SelectItem>
                </SelectContent>
              </Select>
              <input
                type="hidden"
                {...register('role', { required: 'El rol es requerido' })}
              />
              {errors.role ? (
                <p className="text-xs text-destructive">{errors.role.message}</p>
              ) : null}
            </div>
          </div>

          <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">Usuario activo</p>
              <p className="text-xs text-muted-foreground">
                Si está desactivado, no podrá iniciar sesión.
              </p>
            </div>
            <Switch
              checked={!!isActive}
              onCheckedChange={(checked) => setValue('is_active', checked)}
            />
          </label>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form="user-create-form" disabled={submitting}>
            {submitting ? 'Creando...' : 'Crear usuario'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
