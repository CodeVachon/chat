interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup to prevent memory leaks
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanupExpired() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
    lastCleanup = now;

    for (const [key, entry] of store) {
        if (now > entry.resetAt) {
            store.delete(key);
        }
    }
}

/**
 * Check if a socket event should be rate limited.
 * Returns true if the event is allowed, false if it should be dropped.
 */
export function isSocketEventAllowed(
    socketId: string,
    event: string,
    limit: number,
    windowMs: number
): boolean {
    cleanupExpired();

    const key = `${socketId}:${event}`;
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }

    entry.count++;
    return entry.count <= limit;
}

/**
 * Clean up all entries for a disconnected socket.
 */
export function cleanupSocket(socketId: string) {
    for (const key of store.keys()) {
        if (key.startsWith(`${socketId}:`)) {
            store.delete(key);
        }
    }
}

// Export store for testing
export { store as rateLimitStore };
