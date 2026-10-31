import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";

const authMiddleware = withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
  pages: {
    signIn: "/admin/login",
  },
});

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/login") &&
    !pathname.startsWith("/admin/setup")
  ) {
    return authMiddleware(req as any, event);
  }

  return NextResponse.next();
}

// Only run middleware on /admin routes — zero overhead & zero cookie bloat on public pages
export const config = {
  matcher: ["/admin/:path*"],
};
