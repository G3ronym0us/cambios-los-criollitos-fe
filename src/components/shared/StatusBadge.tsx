import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusTone = 'success' | 'warning' | 'destructive' | 'info' | 'neutral' | 'primary';

const toneStyles: Record<StatusTone, string> = {
  success:
    'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
  info: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400',
  neutral: 'border-border bg-muted text-muted-foreground',
  primary: 'border-primary/30 bg-primary/10 text-primary',
};

interface StatusBadgeProps {
  tone?: StatusTone;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ tone = 'neutral', icon: Icon, children, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn('gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', toneStyles[tone], className)}
    >
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {children}
    </Badge>
  );
}
