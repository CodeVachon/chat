# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
bun dev          # Start Docker (Postgres, Redis, Caddy) + Turbo dev (Next.js + Socket.io)
bun dev:apps     # Start only Turbo dev (assumes Docker is running)
bun build        # Production build
bun lint         # Run ESLint across all packages
bun format       # Format code with Prettier (includes Tailwind class sorting)
bun format:check # Check formatting without writing
bun typecheck    # Run TypeScript type checking across all packages
bun db:generate  # Generate Drizzle migrations
bun db:push      # Push schema to database
```

## Architecture

**Monorepo**: Turborepo with Bun workspaces

**Stack**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Socket.io + Caddy

**Component System**: shadcn/ui components built on Base UI primitives with class-variance-authority (CVA) for variants

### Port Assignments

| Service    | Port | Notes             |
| ---------- | ---- | ----------------- |
| Caddy      | 3367 | Main entry point  |
| Next.js    | 3368 | Web app           |
| Socket.io  | 3369 | WebSocket server  |
| PostgreSQL | 5432 | Database          |
| Redis      | 6379 | Pub/sub + adapter |

### Key Directories

- `apps/web/` - Next.js app (pages, API routes, components)
- `apps/socket/` - Standalone Socket.io server
- `packages/db/` - Drizzle schema + database client (`@chat/db`)
- `packages/events/` - Socket.io event types + Redis pub/sub (`@chat/events`)
- `packages/config/` - Shared TypeScript and ESLint configs (`@chat/config`)
- `caddy/` - Caddyfile configs (dev + prod)

### Import Aliases (apps/web)

- `@/*` - Maps to `apps/web/src/*`
- `@/components` - Components folder
- `@/lib/utils` - Utilities
- `@/hooks` - Hooks folder
- `@chat/db` - Database client and schema
- `@chat/events` - Socket event types
- `@chat/events/publisher` - Redis pub/sub publisher (API routes)

## Styling Patterns

- Use `cn()` from `@/lib/utils` for conditional class merging
- Theme variables defined in `apps/web/src/styles/globals.css` as CSS custom properties
- Components use CVA for variant definitions (see `apps/web/src/components/ui/button.tsx` for pattern)

## Adding Components

Use shadcn CLI from the web app directory:

```bash
cd apps/web && bunx shadcn@latest add [component-name]
```

## Workflow

**Dev server**: Assume Docker + dev servers are already running. Access everything at `http://localhost:3367`.

**Pre-commit hook**: Automatically runs format, lint, and typecheck on staged files via husky + lint-staged.

After completing any task, run format and lint on affected files:

```bash
bun run format <files>
bun run lint <files>
```
