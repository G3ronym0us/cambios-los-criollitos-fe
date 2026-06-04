'use client';

import { Plus, UserPlus, Wallet, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FundGroup } from '@/types/fund';

interface GroupSelectorProps {
  groups: FundGroup[];
  selectedGroupUuid: string;
  isModeratorOrAbove: boolean;
  onSelect: (uuid: string) => void;
  onNewGroup: () => void;
  onEditGroup: () => void;
  onAddMember: () => void;
  onRegisterMovement: () => void;
}

export function GroupSelector({
  groups,
  selectedGroupUuid,
  isModeratorOrAbove,
  onSelect,
  onNewGroup,
  onEditGroup,
  onAddMember,
  onRegisterMovement,
}: GroupSelectorProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-1 flex-col gap-1.5 sm:max-w-sm">
          <Label htmlFor="group-select" className="text-xs uppercase tracking-wide text-muted-foreground">
            Grupo de fondos
          </Label>
          <Select value={selectedGroupUuid} onValueChange={(value) => onSelect(value as string)}>
            <SelectTrigger id="group-select" className="h-10 w-full">
              <SelectValue>
                <Wallet className="h-4 w-4" />
                {groups.find((g) => g.uuid === selectedGroupUuid)?.name ?? 'Seleccionar...'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {groups.map((g) => (
                <SelectItem key={g.uuid} value={g.uuid}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isModeratorOrAbove ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="lg" onClick={onNewGroup}>
              <Plus className="h-4 w-4" />
              Nuevo grupo
            </Button>
            {selectedGroupUuid ? (
              <>
                <Button variant="outline" size="lg" onClick={onEditGroup}>
                  <Settings2 className="h-4 w-4" />
                  Editar grupo
                </Button>
                <Button variant="outline" size="lg" onClick={onAddMember}>
                  <UserPlus className="h-4 w-4" />
                  Agregar miembro
                </Button>
                <Button size="lg" onClick={onRegisterMovement}>
                  <Plus className="h-4 w-4" />
                  Registrar movimiento
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
