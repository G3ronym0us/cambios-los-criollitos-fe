# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Turbopack (Next.js 15)
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint for code quality checks

## Architecture Overview

This is a **Next.js 15 frontend application** for a cryptocurrency exchange rate platform that fetches P2P rates from Binance. The app is built with React 19, TypeScript, and Tailwind CSS.

### Key Components Structure

**Authentication System:**
- Context-based auth with JWT tokens stored in localStorage
- `AuthContext` provides login, register, logout, and token refresh
- Protected routes and session persistence
- User roles: USER, MODERATOR, ROOT

**Currency Exchange Features:**
- Real-time exchange rate dashboard from Binance P2P API
- Interactive currency calculator with live rate conversion
- Support for: VES, COP, BRL, USDT, Zelle, PayPal
- Automatic data refresh every 2 minutes

**API Integration:**
- Backend API at `process.env.NEXT_PUBLIC_API_URL`
- Rate fetching endpoint: `/api/rates`
- Manual scraping trigger: `/api/scrape` (POST)
- JWT-based authentication endpoints

### File Organization

```
src/
├── app/                 # Next.js App Router pages
│   ├── auth/login/     # Authentication pages
│   ├── layout.tsx      # Root layout with AuthProvider
│   └── page.tsx        # Main dashboard
├── components/         # Reusable UI components
│   ├── auth/          # Authentication-specific components
│   └── Currency*.tsx  # Exchange rate components
├── contexts/          # React contexts (AuthContext)
├── services/          # API service layers (authService)
├── types/            # TypeScript type definitions
└── utils/            # Utility functions and enums
```

### State Management

- **Authentication:** React Context (`AuthContext`) with localStorage persistence
- **Exchange Rates:** Component-level state with automatic refresh intervals
- **Form Management:** Local state with validation utilities

### Key Technical Details

- Uses **Turbopack** for fast development builds
- **App Router** architecture (Next.js 15)
- **Client-side rendering** for dynamic exchange rate updates
- **Responsive design** with Tailwind CSS
- **Custom SVG icons** for UI elements (RefreshIcon, TrendingUp/Down, etc.)

### Environment Variables

Required environment variables:
- `NEXT_PUBLIC_API_URL` - Backend API base URL

### Testing & Quality

Run linting before commits:
```bash
npm run lint
```

The application includes ESLint configuration with Next.js rules for code quality.