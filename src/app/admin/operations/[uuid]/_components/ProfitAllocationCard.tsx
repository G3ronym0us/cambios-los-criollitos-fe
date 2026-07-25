'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Gift, PiggyBank, Plus, Trash2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { operationService } from '@/services/operationService';
import type { FundGroup } from '@/types/fund';
import type {
  ProfitAllocation,
  ProfitAllocationInput,
  ProfitAllocationList,
} from '@/types/operation';
import { formatNumber } from '@/utils/functions';

interface ProfitAllocationCardProps {
  operationUuid: string;
  clientUuid: string | null;
  clientName: string;
  funds: FundGroup[];
  canEdit: boolean;
}

/** Fila en edición: el destino se identifica por su uuid, sea fondo o cliente. */
interface DraftRow {
  key: string;
  destination: string; // `fund:<uuid>` | `client:<uuid>`
  percentage: string;
}

const CLIENT_PREFIX = 'client:';
const FUND_PREFIX = 'fund:';

function toDraft(allocations: ProfitAllocation[]): DraftRow[] {
  return allocations.map((a, i) => ({
    key: `${a.uuid}-${i}`,
    destination:
      a.destination_type === 'FUND'
        ? `${FUND_PREFIX}${a.fund_group_uuid ?? ''}`
        : `${CLIENT_PREFIX}${a.client_uuid ?? ''}`,
    percentage: String(a.percentage),
  }));
}

export function ProfitAllocationCard({
  operationUuid,
  clientUuid,
  clientName,
  funds,
  canEdit,
}: ProfitAllocationCardProps) {
  const [data, setData] = useState<ProfitAllocationList | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const result = await operationService.getProfitAllocations(operationUuid);
    if (result.success && result.data) setData(result.data);
    setLoading(false);
  }, [operationUuid]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !data) return null;

  const charged = data.charged_percentage;
  const unallocated = data.unallocated_percentage;
  const overAllocated = unallocated < -0.001;

  const startEditing = () => {
    setRows(toDraft(data.allocations));
    setEditing(true);
  };

  const addRow = () => {
    const row: DraftRow = { key: `new-${Date.now()}`, destination: '', percentage: '' };
    setRows((prev) => [...prev, row]);
  };

  const save = async () => {
    const payload: ProfitAllocationInput[] = [];
    for (const row of rows) {
      const percentage = Number(row.percentage);
      if (!row.destination || !Number.isFinite(percentage) || percentage <= 0) {
        toast.error('Cada destino necesita a quién va y un porcentaje mayor que 0');
        return;
      }
      payload.push(
        row.destination.startsWith(FUND_PREFIX)
          ? {
              destination_type: 'FUND',
              fund_group_uuid: row.destination.slice(FUND_PREFIX.length),
              percentage,
            }
          : {
              destination_type: 'CLIENT',
              client_uuid: row.destination.slice(CLIENT_PREFIX.length),
              percentage,
            },
      );
    }

    setSaving(true);
    const result = await operationService.setProfitAllocations(operationUuid, payload);
    setSaving(false);
    if (result.success && result.data) {
      setData(result.data);
      setEditing(false);
      toast.success('Reparto actualizado');
    } else {
      toast.error(result.error || 'No se pudo guardar el reparto');
    }
  };

  const draftTotal = rows.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Reparto de la ganancia
        </CardTitle>
        {canEdit && !editing ? (
          <Button variant="outline" size="sm" onClick={startEditing}>
            Editar
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        <p className="text-sm text-muted-foreground">
          Se le cobró{' '}
          <span className="font-semibold tabular-nums text-foreground">
            {charged != null ? `${charged}%` : 'sin margen'}
          </span>
          {data.value_usdt != null ? (
            <> sobre {formatNumber(data.value_usdt)} USDT de valor</>
          ) : null}
          .
        </p>

        {editing ? (
          <div className="space-y-3">
            {rows.map((row, index) => (
              <div key={row.key} className="flex flex-wrap items-center gap-2">
                <Select
                  value={row.destination}
                  onValueChange={(next) =>
                    setRows((prev) =>
                      prev.map((r, i) => (i === index ? { ...r, destination: next ?? '' } : r)),
                    )
                  }
                >
                  <SelectTrigger className="h-10 min-w-48 flex-1">
                    <SelectValue placeholder="¿A quién va?" />
                  </SelectTrigger>
                  <SelectContent>
                    {funds.map((fund) => (
                      <SelectItem key={fund.uuid} value={`${FUND_PREFIX}${fund.uuid}`}>
                        Fondo {fund.name}
                      </SelectItem>
                    ))}
                    {clientUuid ? (
                      <SelectItem value={`${CLIENT_PREFIX}${clientUuid}`}>
                        Cliente {clientName}
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min={0}
                    max={99}
                    value={row.percentage}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r, i) =>
                          i === index ? { ...r, percentage: e.target.value } : r,
                        ),
                      )
                    }
                    className="h-10 w-24"
                    placeholder="7"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                  aria-label="Quitar destino"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4" />
              Agregar destino
            </Button>

            {charged != null && draftTotal > charged + 0.001 ? (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Estás repartiendo{' '}
                  <span className="font-semibold tabular-nums">{draftTotal}%</span> de un{' '}
                  {charged}% cobrado. Se puede guardar, pero queda firmado a tu nombre.
                </span>
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar reparto'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {data.allocations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin reparto: la ganancia queda en la transacción sin atribuir a ningún fondo.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {data.allocations.map((allocation) => (
                  <li
                    key={allocation.uuid}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                      {allocation.destination_type === 'FUND' ? (
                        <PiggyBank className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <Gift className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      {allocation.destination_name ?? '—'}
                      {allocation.destination_type === 'CLIENT' ? (
                        <span className="text-xs text-muted-foreground">(devuelto)</span>
                      ) : null}
                    </span>
                    <span className="tabular-nums text-sm">
                      <span className="font-medium text-foreground">{allocation.percentage}%</span>
                      {allocation.amount_usdt != null ? (
                        <span className="ml-2 text-muted-foreground">
                          {formatNumber(allocation.amount_usdt)} USDT
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {Math.abs(unallocated) > 0.001 ? (
              <p
                className={
                  overAllocated
                    ? 'text-sm text-amber-700 dark:text-amber-400'
                    : 'text-sm text-muted-foreground'
                }
              >
                {overAllocated ? (
                  <>
                    Se repartió{' '}
                    <span className="font-semibold tabular-nums">
                      {Math.abs(unallocated)}%
                    </span>{' '}
                    más de lo cobrado
                    {data.allocations.some((a) => a.approved_at) ? ', aprobado por el operador' : ''}
                    .
                  </>
                ) : (
                  <>
                    Quedan <span className="font-semibold tabular-nums">{unallocated}%</span> sin
                    asignar.
                  </>
                )}
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
