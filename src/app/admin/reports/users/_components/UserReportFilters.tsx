'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CommissionUserResponse } from '@/types/user';

interface UserReportFiltersProps {
  users: CommissionUserResponse[];
  selectedUserUuid: string;
  startDate: string;
  endDate: string;
  loading: boolean;
  onSelectUser: (uuid: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onApply: () => void;
}

export function UserReportFilters({
  users,
  selectedUserUuid,
  startDate,
  endDate,
  loading,
  onSelectUser,
  onStartDateChange,
  onEndDateChange,
  onApply,
}: UserReportFiltersProps) {
  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end lg:gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="user-select" className="text-xs uppercase tracking-wide text-muted-foreground">
            Usuario
          </Label>
          <Select
            value={selectedUserUuid || ''}
            onValueChange={(next) => onSelectUser(next as string)}
          >
            <SelectTrigger id="user-select" className="h-10 w-full">
              <SelectValue placeholder="Seleccionar usuario..." />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.uuid} value={u.uuid}>
                  {u.full_name || u.username} — {u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="user-start" className="text-xs uppercase tracking-wide text-muted-foreground">
            Fecha inicio
          </Label>
          <Input
            id="user-start"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="h-10"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="user-end" className="text-xs uppercase tracking-wide text-muted-foreground">
            Fecha fin
          </Label>
          <Input
            id="user-end"
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="h-10"
          />
        </div>

        <Button size="lg" onClick={onApply} disabled={!selectedUserUuid || loading}>
          {loading ? 'Cargando...' : 'Aplicar'}
        </Button>
      </CardContent>
    </Card>
  );
}
