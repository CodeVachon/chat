import type { Server as HttpServer } from "http";
import type { Server as IoServer } from "socket.io";

interface Quittable {
    quit: () => Promise<unknown>;
}

interface ShutdownDeps {
    redisSubscriber: Quittable | null;
    pubClient: Quittable | null;
    subClient: Quittable | null;
    io: IoServer;
    server: HttpServer;
}

/**
 * Gracefully shut down all connections.
 * Exported for testability; called by SIGTERM/SIGINT handlers.
 */
export async function gracefulShutdown(deps: ShutdownDeps) {
    console.log("Shutting down...");

    if (deps.redisSubscriber) {
        await deps.redisSubscriber.quit();
    }
    if (deps.pubClient) {
        await deps.pubClient.quit();
    }
    if (deps.subClient) {
        await deps.subClient.quit();
    }

    deps.io.close();
    deps.server.close();
}
