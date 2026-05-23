'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

interface AlertsFiltersProps {
  unackedOnly: boolean;
  loading: boolean;
  onToggleUnacked: (value: boolean) => void;
  onRefresh: () => void;
}

export function AlertsFilters({
  unackedOnly,
  loading,
  onToggleUnacked,
  onRefresh,
}: AlertsFiltersProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex min-h-11 items-center gap-3 cursor-pointer">
          <Switch checked={unackedOnly} onCheckedChange={onToggleUnacked} />
          <span className="text-sm font-medium text-foreground">Solo no vistas</span>
        </label>
        <Button variant="outline" size="lg" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refrescar
        </Button>
      </CardContent>
    </Card>
  );
}
