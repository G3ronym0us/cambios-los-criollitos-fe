# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Turbopack (Next.js 15)
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint for code quality checks

No test runner is configured; use `npm run lint` before committing.

## Architecture Overview

Next.js 15 (App Router) frontend for a P2P cryptocurrency exchange rate platform. Fetches rates from Binance and supports currency conversion between VES, COP, BRL, USDT, Zelle, and PayPal.

### Authentication

- JWT dual-token (access + refresh) stored in **cookies** (`js-cookie`), not localStorage
- `AuthContext` (`src/contexts/AuthContext.tsx`) provides `useAuth()` hook with `login`, `logout`, `refreshToken`, `forceLogout`
- Middleware (`middleware.ts`) protects `/dashboard` and `/admin` routes via token presence check
- Roles: `USER`, `MODERATOR`, `ROOT` — admin sections require MODERATOR or ROOT

### HTTP Layer

All API calls go through a **singleton** `HttpInterceptor` (`src/utils/httpInterceptor.ts`):
- Automatically attaches `Authorization: Bearer <token>` header
- Handles 401 errors via a configurable handler (wired to `forceLogout` in `AuthContext`)
- Has special-case logic for transaction confirmation warnings (returns `{ requiresConfirmation: true }` on specific 400 responses)
- Methods: `get`, `post`, `put`, `patch`, `delete`

### Service Layer

`src/services/` contains one file per domain:
- `authService.ts` — login, register, refresh, getCurrentUser
- `ratesService.ts` — fetch rates by pair UUID or symbol, format utilities
- `adminService.ts` — currency and currency pair CRUD, Binance trade methods
- `userService.ts` — commission user management
- `transactionService.ts` — create/read/update transactions, profit reports
- `commissionConfigService.ts` — commission split configuration
- `bcvService.ts` — BCV rate data

### Currency Calculator Flow

`CurrencyCalculator` fetches available pairs from the backend, lets the user pick a pair via `CurrencySelector`, then computes conversion using the rate from the pair. When `inverse_percentage` is set on a rate, the calculation is inverted. BCV rates are integrated for VES conversions.

### Admin Section

`/admin` layout (`src/app/admin/layout.tsx`) enforces role check (ROOT/MODERATOR). Sub-routes:
- `/admin/currencies` — manage currency definitions
- `/admin/currency-pairs` — manage pairs with `PairType` (BASE, DERIVED, CROSS)
- `/admin/transactions` — create transactions with profit splits, filter by status/currency/date
- `/admin/users` — toggle commission eligibility per user
- `/admin/reports` — per-user profit reports and system-wide summary

### Type Definitions

All domain types live in `src/types/`:
- `currency.ts` — `Currency` enum, `Rate`, `CurrencyPairData`, `ExchangeRateResponse`
- `admin.ts` — `PairType` enum (BASE/DERIVED/CROSS), `CurrencyType` enum (CRYPTO/FIAT)
- `transaction.ts` — `TransactionStatus` enum, `TransactionData`, `ProfitSplitData`
- `auth.d.ts` — `User`, `AuthContextType`, `AuthResponse`

### Utilities

- `src/utils/currencyConfig.ts` — display metadata per currency (name, symbol, Tailwind color); helpers `getCurrencyName()`, `getCurrencySymbol()`, `getCurrencyColor()`
- `src/utils/enums.ts` — `Role`, `MessageType`, `InputType` enums
- `src/utils/validation.ts` — email regex, password rules (8+ chars, upper, lower, number)
- `src/utils/functions.ts` — `formatNumber()`, `getRoleOptions()`

### Environment Variables

- `NEXT_PUBLIC_API_URL` — Backend API base URL (default: `http://localhost:8000`)

### Other Notes

- Path alias `@/*` maps to `./src/*`
- `next.config.ts` allows images from `bin.bnbstatic.com` (Binance assets)
- Tailwind CSS v4 is used with PostCSS

## Component & Styling Conventions

Estas reglas aplican a TODA pantalla nueva o refactorizada. La pantalla `src/app/admin/currency-pairs/` es la implementación de referencia.

### Estructura de carpetas

- `src/components/ui/*` — Primitivos generados por shadcn/ui (Button, Card, Badge, Input, Select, Dialog, DropdownMenu, Switch, Tabs, AlertDialog, Sonner Toaster, etc.). **No editar manualmente** — regenerar con `npx shadcn@latest add <name>`.
- `src/components/shared/*` — Composiciones reutilizables de producto sobre los primitivos:
  - `PageHeader` — título + descripción + acciones, consistente para todas las páginas
  - `StatCard` — icono + label + valor (3 stats típicas en cabecera)
  - `EmptyState` — vacíos / filtros sin resultados
  - `LoadingState` — spinner centrado con label
  - `StatusBadge` — badge con tono semántico (success/warning/destructive/info/neutral/primary) e icono opcional
  - `ThemeToggle` — selector Light/Dark/System (next-themes)
- `src/app/<ruta>/_components/*` — Sub-componentes específicos de UNA pantalla. La carpeta `_` (privada) no genera rutas en Next.js.
- `src/app/<ruta>/_hooks/use<Feature>.ts` — Hook que encapsula el estado, handlers y llamadas a servicios de la pantalla. El `page.tsx` solo compone.
- `src/hooks/*` — Hooks globales (`useConfirm` para confirmaciones bloqueantes).

### Mobile-first obligatorio

- Diseñar primero el layout móvil (sin prefijo) y luego añadir `sm:` (≥640), `md:` (≥768), `lg:` (≥1024). Nunca al revés.
- **No** duplicar UI con `block lg:hidden + hidden lg:block`. Un único componente responsivo.
- Touch targets ≥44px (`min-h-11 min-w-11`) en switches, dropdown triggers, icon buttons.

### Tokens semánticos (obligatorio)

Prohibido usar `gray-*`, `white`, `black` o colores Tailwind crudos para texto/fondos/bordes. Reemplazos:

| Antes | Ahora |
|---|---|
| `bg-white` | `bg-card` |
| `bg-gray-50` | `bg-muted` |
| `text-gray-900` | `text-foreground` |
| `text-gray-500` / `text-gray-600` | `text-muted-foreground` |
| `border-gray-200` | `border-border` |
| `bg-blue-600 text-white` (botón) | `<Button>` variant default |
| rojo destructivo | `<Button variant="destructive">` o tono `destructive` en `StatusBadge` |

Acentos contextuales (success/warning/info) sí pueden usar paletas tailwind con sufijo `/10` y `/30` (ej. `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400`) — mantienen contraste en light y dark.

### Botones de shadcn 4.x

- El `<Button>` actual no acepta `asChild`. Para renderizarlo como otro elemento (ej. `<Link>`), usar el patrón `buttonVariants`:

  ```tsx
  <Link href="/x" className={cn(buttonVariants({ variant: 'ghost', size: 'lg' }), 'w-full')}>...</Link>
  ```

  o el prop `render` cuando el primitivo lo soporta (ej. `<DropdownMenuTrigger render={<Button .../>} />`).

### Dialog vs AlertDialog vs Sheet

- `<Dialog>` — formularios y configuraciones (ej. `BinanceConfigDialog`, modales create/edit).
- `<AlertDialog>` — confirmaciones destructivas. **Usar el hook `useConfirm()`** en vez de `confirm()` nativo.
- `<Sheet>` (instalar cuando sea necesario) — paneles laterales (filtros avanzados en mobile, navegación).

### Loading / Empty / Error

- Loading inicial → `<LoadingState>` o `<Skeleton>` de shadcn.
- Lista vacía / sin resultados → `<EmptyState>`.
- Errores de acción → `toast.error()` de sonner. **Prohibido** `alert()`.
- Confirmaciones bloqueantes → `useConfirm()`. **Prohibido** `confirm()` nativo.
- Éxito de acción → `toast.success()`.

### Dark mode

- Manejado por `next-themes` con `attribute="class"` en el `<ThemeProvider>` del root layout.
- Toggle disponible en `src/components/shared/ThemeToggle.tsx`, montado en el header del admin layout.
- Para soportar dark mode en un componente, basta con **usar los tokens semánticos**. No agregar `dark:` clases manuales salvo para acentos contextuales (success/warning/info).
- El root `<html>` lleva `suppressHydrationWarning` para evitar el warning de SSR de next-themes.

### Patrón para agregar una nueva pantalla admin

1. `src/app/admin/<feature>/page.tsx` con `'use client'` si necesita interactividad; compone solamente.
2. Lógica en `src/app/admin/<feature>/_hooks/use<Feature>.ts` — retorna `{ state, actions }`. Toda llamada a servicios y manejo de modales vive aquí. Reemplaza `alert()` por `toast`, `confirm()` por `await confirm(...)`.
3. Sub-componentes en `src/app/admin/<feature>/_components/`.
4. Composición típica:

   ```tsx
   <PageHeader title="..." description="..." actions={<Button>Nuevo</Button>} />
   <Stats />
   <Filters />
   <List /> {/* maneja loading/empty internamente con LoadingState/EmptyState */}
   <Modales />
   ```

5. Verificar `npm run lint` y `npm run build` antes de marcar como completo.

### Referencia

La pantalla `src/app/admin/currency-pairs/` aplica todas las reglas anteriores: hook `useCurrencyPairs`, sub-componentes en `_components/`, mobile-first con un único `PairItem` responsivo, tokens semánticos, `useConfirm` para borrar, `toast` para éxito/error.
