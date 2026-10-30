# bokra (tracker-v2)

Production habit tracking, ambient focus timers, and flight-based accountability companion.

## Overview

bokra is an offline-first habit tracking and focus companion built with Next.js App Router, Tailwind CSS, Prisma, and Clerk. It combines daily goal tracking with ambient soundscapes, Pomodoro work sessions, FlightRadar-synchronized focus flights, and low-latency social presence.

## Architecture

- **Framework**: Next.js (App Router, React 19)
- **Styling**: Tailwind CSS with custom Apple-inspired dark aesthetic
- **Database**: Neon Serverless PostgreSQL with Prisma ORM
- **Authentication**: Clerk Authentication with secure desktop loopback token exchange
- **State & Storage**: IndexedDB (client offline cache) synchronized with Prisma DB via Last-Write-Wins conflict resolution
- **Integrations**: FlightRadar24 API (live commercial flight telemetry) and Spotify Web API (playback control and token sync)
- **Testing**: Playwright End-to-End browser automation and Google Lighthouse audits

## Key Features

1. **Offline-First Architecture**:
   - Habits, daily completion logs, and focus sessions write immediately to browser IndexedDB.
   - Background delta synchronization with server API (`/api/sync`) upon reconnect.
   - Conflict resolution prevents accidental data loss during guest-to-authenticated account transitions.

2. **Flight Focus Companion**:
   - Real-time commercial flight tracking using FlightRadar24.
   - Dynamic boarding pass generation with departure, cruising, and landing phases.
   - High-precision timestamp-based flight and Pomodoro timers immune to browser background tab throttling.

3. **Social Presence & Accountability**:
   - Mutual friendship graph with live activity status (Focus, Flight, Habit, Idle).
   - Rate-limited social nudges and cheers.
   - Privacy controls to toggle live status sharing per habit or globally.

4. **Desktop & Mobile Companion Apps**:
   - Native macOS bundle (`.dmg`), Windows executable (`.zip`), and Android package (`.apk`).
   - Secure loopback token authorization bridge (`/desktop-auth`).

## Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

```bash
# Database (PostgreSQL / Neon)
DATABASE_URL="postgresql://user:password@endpoint.neon.tech/neondb?sslmode=require"

# Authentication (Clerk Production Live Keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
CLERK_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# Security & Tokens
JWT_SECRET="generate-with-openssl-rand-hex-32"

# Spotify Integration
SPOTIFY_CLIENT_ID="your_spotify_client_id"
SPOTIFY_CLIENT_SECRET="your_spotify_client_secret"

# Optional: Distributed Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL="https://your-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your_token"
```

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Prisma Client & Migrate Database
```bash
npx prisma generate
npx prisma db push
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build and Start for Production
```bash
npm run build
npm run start
```

## Testing & Quality Assurance

- **Linting & Type Safety**:
  ```bash
  npm run lint
  npx tsc --noEmit
  ```
- **Security & Multi-Tenant IDOR Tests**:
  ```bash
  node tests/phase2-deep-verification.mjs
  ```
- **UI / UX & Touch Target Audits**:
  ```bash
  node tests/phase3-ui-check.mjs
  ```
