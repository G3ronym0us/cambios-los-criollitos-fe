'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  buildMonthGrid,
  inRange,
  monthTitle,
  MONTHS_SHORT,
  parseISO,
  toISO,
  toggleRangeDay,
  WEEKDAYS,
  type DateRange,
} from '@/lib/dateRange';

interface RangeCalendarProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

/** Calendario de selección de rango (dos toques) con salto rápido de mes/año. */
export function RangeCalendar({ value, onChange }: RangeCalendarProps) {
  const anchor = parseISO(value.from) ?? parseISO(value.to) ?? new Date();
  const [view, setView] = useState({ year: anchor.getFullYear(), month: anchor.getMonth() });
  const [jump, setJump] = useState<{ open: boolean; year: number }>({
    open: false,
    year: anchor.getFullYear(),
  });
  const [hovered, setHovered] = useState<string | null>(null);

  const today = toISO(new Date());
  const days = buildMonthGrid(view.year, view.month);
  const { from, to } = value;
  const previewEnd = from && !to ? hovered : null;

  const shiftMonth = (delta: number) => {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const pickMonth = (monthIdx: number) => {
    setView({ year: jump.year, month: monthIdx });
    setJump((j) => ({ ...j, open: false }));
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Cabecera de mes con salto rápido */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Mes anterior"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setJump({ open: !jump.open, year: view.year })}
          aria-expanded={jump.open}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-bold text-foreground hover:bg-muted"
        >
          {monthTitle(view.year, view.month)}
          <ChevronRight
            className={cn('h-3.5 w-3.5 transition-transform', jump.open ? '-rotate-90' : 'rotate-90')}
          />
        </button>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Mes siguiente"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {jump.open ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setJump((j) => ({ ...j, year: j.year - 1 }))}
              aria-label="Año anterior"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold text-foreground">{jump.year}</span>
            <button
              type="button"
              onClick={() => setJump((j) => ({ ...j, year: j.year + 1 }))}
              aria-label="Año siguiente"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS_SHORT.map((label, idx) => {
              const active = jump.year === view.year && idx === view.month;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => pickMonth(idx)}
                  className={cn(
                    'rounded-lg py-2 text-center text-[12.5px] font-medium transition-colors',
                    active
                      ? 'bg-primary font-bold text-primary-foreground'
                      : 'text-foreground hover:bg-muted',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 text-center">
            {WEEKDAYS.map((w, i) => (
              <span key={`${w}-${i}`} className="py-1 text-[10.5px] font-semibold text-muted-foreground">
                {w}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((cell) => {
              if (!cell.inMonth) {
                return (
                  <div key={cell.iso} className="py-1 text-center text-xs text-muted-foreground/30">
                    {cell.day}
                  </div>
                );
              }
              const isStart = cell.iso === from;
              const isEnd = cell.iso === to;
              const isEndpoint = isStart || isEnd;
              const isBetween = inRange(cell.iso, from, to) && !isEndpoint;
              const isPreview =
                !!previewEnd &&
                !!from &&
                ((cell.iso > from && cell.iso <= previewEnd) ||
                  (cell.iso < from && cell.iso >= previewEnd));
              const isToday = cell.iso === today;

              return (
                <div key={cell.iso} className="py-0.5 text-center">
                  <button
                    type="button"
                    onClick={() => onChange(toggleRangeDay(value, cell.iso))}
                    onMouseEnter={() => setHovered(cell.iso)}
                    onMouseLeave={() => setHovered((h) => (h === cell.iso ? null : h))}
                    className={cn(
                      'flex h-8 w-full items-center justify-center rounded-md text-xs transition-colors',
                      isEndpoint && 'bg-primary font-semibold text-primary-foreground',
                      isBetween && 'bg-primary/15 text-foreground',
                      !isEndpoint && !isBetween && isPreview && 'bg-primary/10 text-foreground',
                      !isEndpoint && !isBetween && !isPreview && 'text-foreground hover:bg-muted',
                      isToday && !isEndpoint && 'ring-1 ring-inset ring-primary/40',
                    )}
                  >
                    {cell.day}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
