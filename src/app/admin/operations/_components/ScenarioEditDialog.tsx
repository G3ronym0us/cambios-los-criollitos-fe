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
import type { OperationData, OperationScenario, UpdateScenarioPayload } from '@/types/operation';

const NONE = '__none__';

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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!operation) return;
    setScenario(operation.scenario ?? 'NORMAL');
    setGroupUuid(operation.fund_group_uuid ?? NONE);
    setReceivedByUuid(operation.received_by_user_uuid ?? NONE);
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
    const payload: UpdateScenarioPayload = { scenario };
    if (groupUuid === NONE) payload.clear_fund_group = true;
    else payload.fund_group_uuid = groupUuid;
    if (receivedByUuid === NONE) payload.clear_received_by = true;
    else payload.received_by_user_uuid = receivedByUuid;

    const res = await operationService.updateScenario(operation.uuid, payload);
    setSubmitting(false);
    if (res.success) {
      toast.success('Escenario actualizado');
      onSaved();
      onClose();
    } else {
      toast.error(res.error || 'No se pudo actualizar el escenario');
    }
  };

  return (
    <Dialog open={operation !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar escenario</DialogTitle>
          <DialogDescription>
            Define el comportamiento de la operación, su grupo contable y quién recibió el pago entrante.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Escenario</Label>
            <Select value={scenario} onValueChange={(v) => setScenario(v as OperationScenario)}>
              <SelectTrigger className="h-10 w-full">
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
            <Select value={groupUuid} onValueChange={(v) => setGroupUuid(v ?? NONE)}>
              <SelectTrigger className="h-10 w-full">
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
            <Select value={receivedByUuid} onValueChange={(v) => setReceivedByUuid(v ?? NONE)}>
              <SelectTrigger className="h-10 w-full">
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
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
