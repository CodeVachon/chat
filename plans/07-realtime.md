# Sprint 07: Real-time (WebSockets)

## Checklist

- [ ] Create custom server (server.ts)
- [ ] Configure Socket.io with Redis adapter
- [ ] Create socket authentication middleware
- [ ] Create socket event handlers
- [ ] Create useSocket hook
- [ ] Create usePresence hook
- [ ] Create useTyping hook
- [ ] Implement real-time messages
- [ ] Implement presence system
- [ ] Implement typing indicators
- [ ] Create TypingIndicator component
- [ ] Create PresenceIndicator component
- [ ] Update package.json scripts
- [ ] Test real-time in multiple tabs

---

## File Structure

```
/
├── server.ts                    # Custom Node.js server
├── src/
│   ├── lib/
│   │   ├── socket-server.ts     # Server-side socket handlers
│   │   └── redis.ts             # Redis client
│   ├── hooks/
│   │   ├── use-socket.ts
│   │   ├── use-presence.ts
│   │   └── use-typing.ts
│   └── components/
│       ├── chat/
│       │   └── typing-indicator.tsx
│       └── user/
│           └── presence-indicator.tsx
```

---

## 1. Custom Server

Create `server.ts`:

```typescript
import { createServer } from "http";
import next from "next";
import { Server as SocketServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { initSocketHandlers } from "./src/lib/socket-server";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const PORT = parseInt(process.env.PORT || "3367", 10);

app.prepare().then(async () => {
    const httpServer = createServer((req, res) => {
        handle(req, res);
    });

    // Redis pub/sub clients
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);

    // Socket.io with Redis adapter
    const io = new SocketServer(httpServer, {
        cors: { origin: process.env.NEXT_PUBLIC_APP_URL },
        adapter: createAdapter(pubClient, subClient)
    });

    initSocketHandlers(io);

    httpServer.listen(PORT, () => {
        console.log(`> Ready on http://localhost:${PORT}`);
    });
});
```

Update `package.json`:

```json
{
    "scripts": {
        "dev": "tsx watch server.ts",
        "build": "next build",
        "start": "NODE_ENV=production tsx server.ts"
    }
}
```

---

## 2. Socket Event Handlers

Create `src/lib/socket-server.ts`:

```typescript
import { Server, Socket } from "socket.io";
import { validateSession } from "./auth";
import { redis } from "./redis";

const PRESENCE_TTL = 30;
const TYPING_TTL = 3;

export function initSocketHandlers(io: Server) {
    // Authentication middleware
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;
        const session = await validateSession(token);
        if (!session) return next(new Error("Unauthorized"));
        socket.data.user = session.user;
        next();
    });

    io.on("connection", (socket) => {
        const userId = socket.data.user.id;

        // Join user's room for DMs
        socket.join(`user:${userId}`);

        // Set online presence
        setPresence(userId, "online");
        broadcastPresence(io, userId, "online");

        // Channel subscription
        socket.on("channel:join", (channelId) => {
            socket.join(`channel:${channelId}`);
        });

        socket.on("channel:leave", (channelId) => {
            socket.leave(`channel:${channelId}`);
        });

        // Messages (broadcast from API, but could also handle here)
        socket.on("message:send", async (data) => {
            // Validate and broadcast
            io.to(`channel:${data.channelId}`).emit("message:new", data);
        });

        // Typing indicators
        socket.on("typing:start", async ({ channelId }) => {
            await setTyping(channelId, userId);
            socket.to(`channel:${channelId}`).emit("typing:update", {
                channelId,
                userId,
                isTyping: true
            });
        });

        socket.on("typing:stop", async ({ channelId }) => {
            await clearTyping(channelId, userId);
            socket.to(`channel:${channelId}`).emit("typing:update", {
                channelId,
                userId,
                isTyping: false
            });
        });

        // Heartbeat for presence
        socket.on("heartbeat", () => {
            setPresence(userId, "online");
        });

        socket.on("disconnect", () => {
            setPresence(userId, "offline");
            broadcastPresence(io, userId, "offline");
        });
    });
}

// Redis helpers
async function setPresence(userId: string, status: string) {
    await redis.setex(`presence:${userId}`, PRESENCE_TTL, status);
}

async function setTyping(channelId: string, userId: string) {
    await redis.setex(`typing:${channelId}:${userId}`, TYPING_TTL, "1");
}

async function clearTyping(channelId: string, userId: string) {
    await redis.del(`typing:${channelId}:${userId}`);
}
```

---

## 3. Client Hooks

### useSocket

```typescript
// Connect to socket, handle reconnection
// Auto-join channels user is member of
// Provide emit function
```

### usePresence

```typescript
// Track online users in current channel
// Send heartbeat every 15s
// Update local state on presence:update
```

### useTyping

```typescript
// Emit typing:start on input change (debounced)
// Emit typing:stop on blur or submit
// Track who is typing in channel
// Clear after TYPING_TTL
```

---

## 4. Socket Events

### Server → Client

| Event             | Payload                         | Description            |
| ----------------- | ------------------------------- | ---------------------- |
| `message:new`     | Message                         | New message in channel |
| `message:update`  | Message                         | Message edited         |
| `message:delete`  | { id }                          | Message deleted        |
| `typing:update`   | { channelId, userId, isTyping } | Typing indicator       |
| `presence:update` | { userId, status }              | User online/offline    |
| `member:join`     | { channelId, user }             | User joined channel    |
| `member:leave`    | { channelId, userId }           | User left channel      |

### Client → Server

| Event           | Payload       | Description              |
| --------------- | ------------- | ------------------------ |
| `channel:join`  | channelId     | Subscribe to channel     |
| `channel:leave` | channelId     | Unsubscribe from channel |
| `typing:start`  | { channelId } | User started typing      |
| `typing:stop`   | { channelId } | User stopped typing      |
| `heartbeat`     | -             | Keep presence alive      |

---

## 5. Presence System

- **TTL**: 30 seconds
- **Heartbeat**: Client sends every 15 seconds
- **Storage**: Redis key `presence:{userId}` with value `online|away|dnd|offline`
- **Status change**: Broadcast to all connected users

---

## 6. Typing Indicators

- **TTL**: 3 seconds (auto-clears if user stops typing)
- **Debounce**: Client debounces to emit every 2 seconds while typing
- **Display**: "User is typing...", "User1 and User2 are typing...", "Several people are typing..."

---

## Verification

- [ ] Socket connects on page load
- [ ] Messages appear instantly in other tabs
- [ ] Typing indicator shows when user types
- [ ] Typing indicator clears after 3s
- [ ] Presence shows online status
- [ ] Presence updates on disconnect
- [ ] Reconnection works after network drop
- [ ] Redis adapter enables multi-server support
