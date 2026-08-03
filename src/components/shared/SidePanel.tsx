'use client';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Panel de detalle: cajón anclado al borde derecho en desktop, hoja inferior en mobile.
 *
 * El `<Drawer>` de `components/ui` resuelve el caso corto (confirmar, editar un campo) y
 * en ≥sm se convierte en tarjeta centrada. Esto es lo contrario: contenido largo que se
 * consulta mientras se mira la lista, así que en desktop se queda al lado en vez de tapar
 * la pantalla. Comparte primitivo (base-ui Dialog), así que hereda foco, escape y scroll lock.
 */

interface SidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function SidePanel({ open, onOpenChange, children, className }: SidePanelProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            'fixed inset-0 z-50 bg-black/30 duration-150 supports-backdrop-filter:backdrop-blur-xs',
            'data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
          )}
        />
        <DialogPrimitive.Popup
          className={cn(
            'fixed z-50 flex flex-col bg-background text-foreground outline-none duration-200',
            // Mobile: hoja inferior, alto acotado para que se siga viendo la lista detrás.
            'inset-x-0 bottom-0 max-h-[92vh] rounded-t-2xl ring-1 ring-foreground/10',
            'data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom',
            // ≥sm: cajón a la derecha, alto completo.
            'sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[min(28rem,100vw)] sm:rounded-none sm:border-l sm:border-border sm:ring-0 sm:shadow-2xl',
            'sm:data-open:slide-in-from-right sm:data-closed:slide-out-to-right',
            className,
          )}
        >
          <div
            aria-hidden
            className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/25 sm:hidden"
          />
          {children}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function SidePanelHeader({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-5',
        className,
      )}
      {...props}
    >
      <div className="min-w-0">{children}</div>
      <DialogPrimitive.Close
        aria-label="Cerrar"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </div>
  );
}

export function SidePanelBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5',
        className,
      )}
      {...props}
    />
  );
}

export const SidePanelTitle = DialogPrimitive.Title;
export const SidePanelDescription = DialogPrimitive.Description;
export const SidePanelClose = DialogPrimitive.Close;
