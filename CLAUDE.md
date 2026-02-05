# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
bun dev          # Start development server (port 3367)
bun build        # Production build
bun start        # Start production server
bun lint         # Run ESLint
bun format       # Format code with Prettier (includes Tailwind class sorting)
bun format:check # Check formatting without writing
bun typecheck    # Run TypeScript type checking
```

## Architecture

**Stack**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4

**Component System**: shadcn/ui components built on Base UI primitives with class-variance-authority (CVA) for variants

### Key Directories

- `src/app/` - Next.js App Router pages and layouts
- `src/components/ui/` - Reusable shadcn UI components (Button, Card, Select, etc.)
- `src/lib/utils.ts` - `cn()` utility for className composition (clsx + tailwind-merge)
- `src/styles/` - Global CSS and theme variables

### Import Aliases

- `@/*` - Root directory
- `@/components` - Components folder
- `@/lib/utils` - Utilities
- `@/hooks` - Hooks folder

## Styling Patterns

- Use `cn()` from `@/lib/utils` for conditional class merging
- Theme variables defined in `src/styles/globals.css` as CSS custom properties
- Components use CVA for variant definitions (see `components/ui/button.tsx` for pattern)

## Adding Components

Use shadcn CLI to add new components:

```bash
bunx shadcn@latest add [component-name]
```

## Workflow

**Dev server**: Assume the dev server is already running on port 3367. Ask before starting one to avoid port collisions.

**Pre-commit hook**: Automatically runs format, lint, and typecheck on staged files via husky + lint-staged.

After completing any task, run format and lint on affected files:

```bash
bun run format <files>
bun run lint <files>
```
