'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface NewEntityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (displayName: string, groupJid: string | null) => Promise<boolean>;
}

export function NewEntityDialog({ open, onOpenChange, onCreate }: NewEntityDialogProps) {
  const [name, setName] = useState('');
  const [groupJid, setGroupJid] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!name.trim()) return toast.error('Ponle un nombre al negocio');
    setSubmitting(true);
    const ok = await onCreate(name.trim(), groupJid.trim() || null);
    setSubmitting(false);
    if (ok) {
      setName('');
      setGroupJid('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo cliente-entidad</DialogTitle>
          <DialogDescription>
            Un negocio que no escribe al bot desde un teléfono propio. Sirve para llevarle
            préstamos y deuda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="entity-name">Nombre del negocio</Label>
            <Input
              id="entity-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Bodegón X"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="entity-group">Grupo de WhatsApp (opcional)</Label>
            <Input
              id="entity-group"
              value={groupJid}
              onChange={(event) => setGroupJid(event.target.value)}
              placeholder="1203630000000@g.us"
            />
            <p className="text-xs text-muted-foreground">
              Si mandas los comprobantes a un grupo, pégalo aquí y el préstamo lo propondrá
              solo cuando registres un pago de ese grupo.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'Creando…' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
