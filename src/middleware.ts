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

  // Track Analytics for public pages
  // Ignore static assets, api, next internals, admin
  if (
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/admin') &&
    !pathname.includes('.')
  ) {
    const visitedCookie = req.cookies.get('visited_paths');
    let visitedPaths = visitedCookie ? visitedCookie.value.split(',') : [];

    // Remove empty strings
    visitedPaths = visitedPaths.filter(Boolean);

    // Track if not visited in this session
    if (!visitedPaths.includes(pathname)) {
      visitedPaths.push(pathname);
      
      // Fire and forget fetch to our analytics API
      event.waitUntil(
        fetch(new URL('/api/analytics', req.url).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: pathname })
        }).catch(err => console.error('Failed to log analytics', err))
      );

      // Create response and set cookie
      const res = NextResponse.next();
      res.cookies.set('visited_paths', visitedPaths.join(','), { 
        maxAge: 60 * 60 * 24, // 1 day
        path: '/',
        sameSite: 'lax',
      });
      return res;
    }
  }

  // Handle Admin routes with Auth
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login') && !pathname.startsWith('/admin/setup')) {
    return authMiddleware(req as any, event);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
