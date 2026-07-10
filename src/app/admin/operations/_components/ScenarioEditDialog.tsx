'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
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
import { operationService } from '@/services/operationService';
import type { FundGroup } from '@/types/fund';
import type { OperationData, OperationScenario, UpdateOperationPayload } from '@/types/operation';

const NONE = '__none__';
const PHONE_PRESENTATION_CHARACTERS = /[ +\-().]/g;
const VALID_PHONE = /^\d{4,32}$/;

const SCENARIO_OPTIONS: { value: OperationScenario; label: string }[] = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'ZELLE_DIRECT', label: 'Zelle directo' },
  { value: 'VIA_PARTNER', label: 'Vía socio' },
];

interface ScenarioEditDialogProps {
  operation: OperationData | null;
  groups: FundGroup[];
  onClose: () => void;
  onSaved: () => void;
}

export function ScenarioEditDialog({ operation, groups, onClose, onSaved }: ScenarioEditDialogProps) {
  const [scenario, setScenario] = useState<OperationScenario>('NORMAL');
  const [groupUuid, setGroupUuid] = useState<string>(NONE);
  const [receivedByUuid, setReceivedByUuid] = useState<string>(NONE);
  const [clientPhone, setClientPhone] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhoneError, setClientPhoneError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!operation) return;
    setScenario(operation.scenario ?? 'NORMAL');
    setGroupUuid(operation.fund_group_uuid ?? NONE);
    setReceivedByUuid(operation.received_by_user_uuid ?? NONE);
    setClientPhone(operation.client_phone ?? '');
    setClientName(operation.client_display_name ?? '');
    setClientPhoneError(null);
  }, [operation]);

  // Socios elegibles: miembros del grupo seleccionado (o de todos los grupos si no hay uno).
  const partnerOptions = useMemo(() => {
    const source = groupUuid !== NONE ? groups.filter((g) => g.uuid === groupUuid) : groups;
    const seen = new Set<string>();
    const out: { uuid: string; label: string }[] = [];
    for (const g of source) {
      for (const m of g.members ?? []) {
        if (seen.has(m.user_uuid)) continue;
        seen.add(m.user_uuid);
        out.push({ uuid: m.user_uuid, label: m.username || m.user_uuid.slice(0, 8) });
      }
    }
    return out;
  }, [groups, groupUuid]);

  const handleSave = async () => {
    if (!operation) return;
    setSubmitting(true);

    const payload: UpdateOperationPayload = { scenario };
    if (groupUuid === NONE) payload.clear_fund_group = true;
    else payload.fund_group_uuid = groupUuid;
    if (receivedByUuid === NONE) payload.clear_received_by = true;
    else payload.received_by_user_uuid = receivedByUuid;

    // El cliente viaja en la misma petición que el escenario para evitar guardados parciales.
    const phoneChanged = clientPhone.trim() !== (operation.client_phone ?? '');
    const nameChanged = clientName.trim() !== (operation.client_display_name ?? '');
    if (phoneChanged || nameChanged) {
      if (!clientPhone.trim()) {
        setSubmitting(false);
        setClientPhoneError('El teléfono del cliente es obligatorio.');
        return;
      }

      const normalizedPhone = clientPhone.trim().replace(PHONE_PRESENTATION_CHARACTERS, '');
      if (!VALID_PHONE.test(normalizedPhone)) {
        setSubmitting(false);
        setClientPhoneError('Usa entre 4 y 32 dígitos; puedes incluir +, espacios o guiones.');
        return;
      }

      payload.client_phone = clientPhone.trim();
      payload.client_display_name = clientName.trim() || null;
    }

    const res = await operationService.updateOperation(operation.uuid, payload);
    setSubmitting(false);
    if (res.success) {
      toast.success('Operación actualizada');
      onSaved();
      onClose();
    } else {
      toast.error(res.error || 'No se pudo actualizar la operación');
    }
  };

  return (
    <Dialog open={operation !== null} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar operación</DialogTitle>
          <DialogDescription>
            Cliente real de la operación, escenario, grupo contable y quién recibió el pago entrante.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="op-client-phone">Cliente (teléfono)</Label>
            <Input
              id="op-client-phone"
              inputMode="tel"
              autoComplete="tel"
              placeholder="584121234567"
              value={clientPhone}
              onChange={(e) => {
                setClientPhone(e.target.value);
                setClientPhoneError(null);
              }}
              maxLength={32}
              disabled={submitting}
              aria-invalid={clientPhoneError !== null}
              aria-describedby={clientPhoneError ? 'op-client-phone-error' : 'op-client-phone-help'}
              className="h-11"
            />
            {clientPhoneError ? (
              <p id="op-client-phone-error" role="alert" className="text-xs text-destructive">
                {clientPhoneError}
              </p>
            ) : (
              <p id="op-client-phone-help" className="text-xs text-muted-foreground">
                La operación y sus pagos vinculados pasarán a este cliente.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="op-client-name">Nombre del cliente (opcional)</Label>
            <Input
              id="op-client-name"
              placeholder="Nombre visible"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              maxLength={120}
              disabled={submitting}
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Escenario</Label>
            <Select
              disabled={submitting}
              value={scenario}
              onValueChange={(v) => setScenario(v as OperationScenario)}
            >
              <SelectTrigger className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCENARIO_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Grupo (fondo)</Label>
            <Select
              disabled={submitting}
              value={groupUuid}
              onValueChange={(v) => setGroupUuid(v ?? NONE)}
            >
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Sin grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin grupo</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.uuid} value={g.uuid}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Recibido por (socio)</Label>
            <Select
              disabled={submitting}
              value={receivedByUuid}
              onValueChange={(v) => setReceivedByUuid(v ?? NONE)}
            >
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Operador (yo)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Operador (yo)</SelectItem>
                {partnerOptions.map((p) => (
                  <SelectItem key={p.uuid} value={p.uuid}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button className="min-h-11" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button className="min-h-11" onClick={handleSave} disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
