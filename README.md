# Chat

A Next.js chat application built with modern tooling and component patterns.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Runtime**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Components**: shadcn/ui with Base UI primitives
- **Package Manager**: Bun

## Getting Started

```bash
# Install dependencies
bun install

# Start development server
bun dev
```

Open [http://localhost:3367](http://localhost:3367) to view the application.

## Scripts

| Command            | Description                                                 |
| ------------------ | ----------------------------------------------------------- |
| `bun dev`          | Start development server (port 3367)                        |
| `bun build`        | Create production build                                     |
| `bun start`        | Start production server                                     |
| `bun lint`         | Run ESLint                                                  |
| `bun format`       | Format code with Prettier (includes Tailwind class sorting) |
| `bun format:check` | Check formatting without writing                            |
| `bun typecheck`    | Run TypeScript type checking                                |

## Project Structure

```
src/
├── app/           # Next.js App Router pages and layouts
├── components/
│   └── ui/        # shadcn/ui components
├── lib/           # Utilities (cn helper, etc.)
└── styles/        # Global CSS and theme variables
```

## Code Quality

### Pre-commit Hooks

This project uses husky + lint-staged to automatically run on staged files before each commit:

- Prettier formatting (with Tailwind class sorting)
- ESLint (with auto-fix for imports)
- TypeScript type checking

### ESLint Configuration

- Import sorting via `eslint-plugin-simple-import-sort`
- Unused import removal via `eslint-plugin-unused-imports`
- Next.js recommended rules

### Adding Components

```bash
bunx shadcn@latest add [component-name]
```
