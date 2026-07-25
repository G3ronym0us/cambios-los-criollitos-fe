'use client';

import { useRef, useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { useDismiss } from '@/hooks/useDismiss';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import {
  daysInclusive,
  formatRangeLabel,
  presetRange,
  type DatePreset,
  type DateRange,
} from '@/lib/dateRange';
import { RangeCalendar } from './RangeCalendar';

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'last7', label: '7 días' },
  { key: 'last30', label: '30 días' },
  { key: 'thisMonth', label: 'Este mes' },
];

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  label?: string;
  align?: 'start' | 'end';
  className?: string;
}

/**
 * Filtro de rango de fechas reutilizable: chip disparador + calendario de rango con
 * presets y salto rápido de mes/año. En desktop se abre como popover anclado; en mobile,
 * como bottom sheet. Emite el rango (yyyy-mm-dd) al pulsar «Aplicar» o «Limpiar».
 */
export function DateRangeFilter({
  value,
  onChange,
  label = 'Rango de fechas',
  align = 'start',
  className,
}: DateRangeFilterProps) {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(value);

  useDismiss(containerRef, open && !isMobile, () => setOpen(false));

  const hasValue = !!value.from || !!value.to;
  const triggerLabel = hasValue ? formatRangeLabel(value.from, value.to) : label;

  const openPanel = () => {
    setDraft(value);
    setOpen(true);
  };
  const toggle = () => (open ? setOpen(false) : openPanel());

  const activePreset = PRESETS.find((p) => {
    const r = presetRange(p.key);
    return draft.from === r.from && draft.to === r.to;
  })?.key;

  const apply = () => {
    onChange(draft);
    setOpen(false);
  };
  const clear = () => {
    setDraft({});
    onChange({});
    setOpen(false);
  };

  const summary =
    draft.from && draft.to
      ? `${formatRangeLabel(draft.from, draft.to)} · ${daysInclusive(draft.from, draft.to)} días`
      : draft.from || draft.to
        ? formatRangeLabel(draft.from, draft.to)
        : 'Sin rango';

  const panel = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setDraft(presetRange(p.key))}
            className={cn(
              'rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors',
              activePreset === p.key
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground hover:bg-muted/70',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <RangeCalendar value={draft} onChange={setDraft} />

      <div className="flex items-center justify-between gap-2 border-t border-border pt-2.5">
        <span className="text-xs text-muted-foreground">{summary}</span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={clear}>
            Limpiar
          </Button>
          <Button type="button" size="sm" className="h-8" onClick={apply}>
            Aplicar
          </Button>
        </div>
      </div>
    </div>
  );

  const trigger = (
    <Button
      type="button"
      variant="outline"
      size="lg"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={toggle}
      className={cn(
        'h-10 gap-1.5 rounded-lg font-medium',
        hasValue && 'bg-muted font-semibold',
        open && !isMobile && 'border-primary',
        className,
      )}
    >
      <CalendarRange className="h-4 w-4" />
      {triggerLabel}
    </Button>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerTitle className="sr-only">{label}</DrawerTitle>
            {panel}
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {trigger}
      {open ? (
        <div
          role="dialog"
          aria-label={label}
          className={cn(
            'absolute top-[calc(100%+6px)] z-20 w-80 rounded-xl border border-border bg-popover p-3.5 shadow-lg',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {panel}
        </div>
      ) : null}
    </div>
  );
}
