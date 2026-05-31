// src/middleware.ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default auth((req: NextRequest & { auth: { user?: { role?: string } } | null }) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;

  // Public routes
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    if (isLoggedIn && pathname === '/login') {
      return NextResponse.redirect(new URL('/chat', req.url));
    }
    return NextResponse.next();
  }

  // API routes — return 401 JSON instead of redirect
  if (pathname.startsWith('/api/')) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Admin API protection
    if (pathname.startsWith('/api/admin/') && req.auth?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.next();
  }

  // All other routes require login
  if (!isLoggedIn) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)'],
};
