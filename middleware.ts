// E:\trifuzja-mix\middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken, type JWT } from 'next-auth/jwt';

// JWT الخاص بك مع حقل role
type AppJWT = JWT & {
  role?: 'admin' | 'editor' | 'user';
};

// type guard لتضييق النوع إلى AppJWT بدون casts
function isAppJWT(token: JWT | null): token is AppJWT {
  return !!token && (typeof (token as Record<string, unknown>).role === 'string' || !('role' in (token as object)));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // اسمح بملفات السيو من الجذر
  if (
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/sitemap') // يشمل /sitemap-0.xml
  ) {
    return NextResponse.next();
  }

  // إعادة التوجيه إلى اللغة الافتراضية إذا لم تكن محددة
  if (
    !pathname.startsWith('/en') &&
    !pathname.startsWith('/pl') &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/favicon.ico') &&
    !pathname.startsWith('/upload') &&
    !pathname.startsWith('/flags') &&
    !pathname.startsWith('/images')
  ) {
    return NextResponse.redirect(new URL(`/en${pathname}`, req.url));
  }

  // حماية /admin
  if (pathname.startsWith('/admin')) {
    const raw = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const token: AppJWT | null = isAppJWT(raw) ? raw : null;

    if (token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};
