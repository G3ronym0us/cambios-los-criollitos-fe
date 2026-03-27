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
