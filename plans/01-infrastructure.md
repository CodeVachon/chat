# Sprint 01: Infrastructure Setup

## Checklist

- [ ] Create Docker Compose configuration
- [ ] Install production dependencies
- [ ] Install dev dependencies
- [ ] Create environment template
- [ ] Configure Drizzle
- [ ] Update next.config.ts for custom server

---

## 1. Docker Compose

Create `docker-compose.yml`:

```yaml
services:
    postgres:
        image: postgres:16-alpine
        environment:
            POSTGRES_USER: chat
            POSTGRES_PASSWORD: chat_dev
            POSTGRES_DB: chat
        ports:
            - "5432:5432"
        volumes:
            - postgres_data:/var/lib/postgresql/data

    redis:
        image: redis:7-alpine
        ports:
            - "6379:6379"
        volumes:
            - redis_data:/data

volumes:
    postgres_data:
    redis_data:
```

---

## 2. Dependencies

### Production

```bash
bun add drizzle-orm pg dotenv better-auth socket.io socket.io-client zod nanoid date-fns cloudinary next-cloudinary ioredis
```

### Development

```bash
bun add -D drizzle-kit @types/pg @types/node
```

---

## 3. Environment Template

Create `.env.example`:

```env
# Database
DATABASE_URL=postgres://chat:chat_dev@localhost:5432/chat

# Redis
REDIS_URL=redis://localhost:6379

# Auth
BETTER_AUTH_SECRET=generate-a-secure-secret-here
BETTER_AUTH_URL=http://localhost:3367

# OAuth - GitHub
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# OAuth - Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3367
```

---

## 4. Drizzle Configuration

Create `drizzle.config.ts`:

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./src/db/schema/index.ts",
    out: "./src/db/migrations",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL!
    }
});
```

---

## 5. Database Client

Create `src/db/index.ts`:

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

export const db = drizzle(pool, { schema });
```

---

## Verification

- [ ] `docker compose up -d` starts PostgreSQL and Redis
- [ ] Can connect to PostgreSQL on localhost:5432
- [ ] Can connect to Redis on localhost:6379
- [ ] `bun run typecheck` passes with new dependencies
