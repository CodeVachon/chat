import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
    "/login",
    "/signup",
    "/request-access",
    "/invite",
    "/api/auth",
    "/api/setup/status",
    "/api/invites/link",
    "/api/invites/requests"
];

const AUTH_PAGES = ["/login", "/signup"];

function isPublicPath(pathname: string): boolean {
    return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const sessionCookie = request.cookies.get("better-auth.session_token");

    const isPublic = isPublicPath(pathname);

    // Redirect authenticated users away from login/signup
    if (sessionCookie && AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    // Allow public routes through
    if (isPublic) {
        return NextResponse.next();
    }

    // Redirect unauthenticated users to login
    if (!sessionCookie) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
