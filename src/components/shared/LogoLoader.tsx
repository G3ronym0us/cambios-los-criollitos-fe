import { cn } from '@/lib/utils';

interface LogoLoaderProps {
  label?: string;
  className?: string;
  size?: number;
  fullHeight?: boolean;
}

/**
 * Loader de marca: el ciclo del cambio (flechas) gira alrededor
 * del centro estático del logo (sol + puente de Angostura).
 */
export function LogoLoader({ label, className, size = 72, fullHeight = false }: LogoLoaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 text-muted-foreground',
        fullHeight ? 'min-h-[40vh]' : 'py-12',
        className
      )}
      role="status"
      aria-label={label ?? 'Cargando'}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
        <g className="animate-spin" style={{ transformOrigin: '50px 50px', animationDuration: '1.4s' }}>
          <path d="M 8.7 35.0 A 44 44 0 0 1 83.7 21.7" fill="none" stroke="#E8821E" strokeWidth="8" strokeLinecap="round" />
          <polygon points="89.1,17.2 78.3,26.2 90.8,30.1" fill="#E8821E" />
          <path d="M 91.3 65.0 A 44 44 0 0 1 16.3 78.3" fill="none" stroke="#E8821E" strokeWidth="8" strokeLinecap="round" />
          <polygon points="10.9,82.8 21.7,73.8 9.2,69.9" fill="#E8821E" />
        </g>
        <circle cx="50" cy="50" r="32" fill="#E8821E" />
        <circle cx="50" cy="40" r="10" fill="#F5B81C" />
        <rect x="24" y="56" width="52" height="4" rx="2" fill="#232019" />
        <rect x="35.2" y="38" width="3.6" height="20" rx="1.8" fill="#232019" />
        <rect x="61.2" y="38" width="3.6" height="20" rx="1.8" fill="#232019" />
        <path d="M 24 57 L 37 40 Q 50 56 63 40 L 76 57" fill="none" stroke="#232019" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 44 46.3 L 44 56 M 50 48 L 50 56 M 56 46.3 L 56 56" fill="none" stroke="#232019" strokeWidth="1.8" />
        <path d="M 29 68 Q 36 64.5 43 68 Q 50 71.5 57 68 Q 64 64.5 71 68" fill="none" stroke="#FBFAF6" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label ? <p className="text-sm">{label}</p> : null}
    </div>
  );
}
