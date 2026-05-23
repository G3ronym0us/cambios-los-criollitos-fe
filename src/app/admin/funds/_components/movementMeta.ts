import { ArrowDownToLine, RefreshCw, Settings, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MovementType } from '@/types/fund';

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  [MovementType.DEPOSIT]: 'Depósito',
  [MovementType.EXCHANGE]: 'Cambio',
  [MovementType.PERSONAL]: 'Personal',
  [MovementType.ADJUSTMENT]: 'Ajuste',
};

export const MOVEMENT_META: Record<
  MovementType,
  { label: string; tone: 'success' | 'info' | 'warning' | 'neutral'; icon: LucideIcon }
> = {
  [MovementType.DEPOSIT]: { label: 'Depósito', tone: 'success', icon: ArrowDownToLine },
  [MovementType.EXCHANGE]: { label: 'Cambio', tone: 'info', icon: RefreshCw },
  [MovementType.PERSONAL]: { label: 'Personal', tone: 'warning', icon: Wallet },
  [MovementType.ADJUSTMENT]: { label: 'Ajuste', tone: 'neutral', icon: Settings },
};
