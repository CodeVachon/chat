# Sprint 03: Authentication

## Checklist

- [ ] Configure better-auth with Drizzle adapter
- [ ] Add credentials provider
- [ ] Add GitHub OAuth provider
- [ ] Add Google OAuth provider
- [ ] Create auth API route handler
- [ ] Create auth client for React
- [ ] Create middleware for route protection
- [ ] Create useSession hook
- [ ] Create useUser hook
- [ ] Test credential login/signup
- [ ] Test GitHub OAuth
- [ ] Test Google OAuth

---

## File Structure

```
src/
├── lib/
│   ├── auth.ts           # Server-side auth config
│   └── auth-client.ts    # Client-side auth
├── hooks/
│   ├── use-session.ts
│   └── use-user.ts
├── middleware.ts         # Route protection
└── app/
    └── api/
        └── auth/
            └── [...all]/
                └── route.ts
```

---

## 1. Auth Configuration

Create `src/lib/auth.ts`:

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg"
    }),
    emailAndPassword: {
        enabled: true
    },
    socialProviders: {
        github: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!
        },
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!
        }
    },
    plugins: [nextCookies()],
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24 // 1 day
    }
});

export type Session = typeof auth.$Infer.Session;
```

---

## 2. Auth Client

Create `src/lib/auth-client.ts`:

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

---

## 3. API Route Handler

Create `src/app/api/auth/[...all]/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

---

## 4. Middleware

Create `src/middleware.ts`:

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const publicPaths = ["/login", "/invite", "/request-access", "/api/auth"];
const setupPath = "/setup";

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public paths
    if (publicPaths.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    const sessionCookie = getSessionCookie(request);

    // No session -> login
    if (!sessionCookie) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // TODO: Check if setup completed, redirect to /setup if not

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
```

---

## 5. Hooks

Create `src/hooks/use-session.ts`:

- Re-export from auth-client
- Add loading state handling

Create `src/hooks/use-user.ts`:

- Fetch full user with org role
- Combine session + user data

---

## Verification

- [ ] Can sign up with email/password
- [ ] Can sign in with email/password
- [ ] Can sign in with GitHub
- [ ] Can sign in with Google
- [ ] Session persists across page refreshes
- [ ] Protected routes redirect to /login
- [ ] Sign out clears session
