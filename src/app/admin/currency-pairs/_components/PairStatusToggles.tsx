'use client';

import { Bitcoin, Eye, ToggleRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { CurrencyPairData } from '@/types/admin';

interface PairStatusTogglesProps {
  pair: CurrencyPairData;
  onToggleActive: (pair: CurrencyPairData) => void;
  onToggleMonitored: (pair: CurrencyPairData) => void;
  onToggleBinance: (pair: CurrencyPairData) => void;
}

interface ToggleRowProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  description: string;
  icon: React.ReactNode;
}

function ToggleRow({ checked, onChange, label, description, icon }: ToggleRowProps) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-background/40 px-3 py-2 transition-colors hover:bg-muted/40">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

export function PairStatusToggles({
  pair,
  onToggleActive,
  onToggleMonitored,
  onToggleBinance,
}: PairStatusTogglesProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <ToggleRow
        checked={pair.is_active}
        onChange={() => onToggleActive(pair)}
        label="Activo"
        description={pair.is_active ? 'Visible para usuarios' : 'Oculto'}
        icon={<ToggleRight className="h-4 w-4" />}
      />
      <ToggleRow
        checked={pair.is_monitored}
        onChange={() => onToggleMonitored(pair)}
        label="Monitor"
        description={pair.is_monitored ? 'Tasas actualizadas' : 'Sin monitoreo'}
        icon={<Eye className="h-4 w-4" />}
      />
      <ToggleRow
        checked={pair.binance_tracked}
        onChange={() => onToggleBinance(pair)}
        label="Binance P2P"
        description={pair.binance_tracked ? 'Conectado a Binance' : 'Desactivado'}
        icon={<Bitcoin className="h-4 w-4" />}
      />
    </div>
  );
}
