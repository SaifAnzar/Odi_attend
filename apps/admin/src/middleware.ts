import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAuth, normalizeRole } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0. Root URL redirect to appropriate dashboard or login
  if (pathname === '/') {
    const userPayload = await verifyAuth(request);
    if (userPayload) {
      const role = normalizeRole(userPayload.role);
      if (role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      } else {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 1. Redirect authenticated users away from /login page to their respective dashboard
  if (pathname === '/login') {
    const userPayload = await verifyAuth(request);
    if (userPayload) {
      const role = normalizeRole(userPayload.role);
      if (role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      } else {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    return NextResponse.next();
  }

  // 2. Protect all routes starting with /admin
  if (pathname.startsWith('/admin')) {
    const userPayload = await verifyAuth(request);

    // If user is not logged in, redirect to /login
    if (!userPayload) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', encodeURIComponent(pathname));
      return NextResponse.redirect(loginUrl);
    }

    // RBAC: Check user role
    const role = normalizeRole(userPayload.role);
    
    // If role === 'EMPLOYEE' or 'INTERN', immediately redirect to /unauthorized
    if (role === 'EMPLOYEE' || role === 'INTERN') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/admin/:path*',
    '/login',
  ],
};
