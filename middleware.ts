// E:\trifuzja-mix\middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { JWT } from 'next-auth/jwt';

type Locale = 'en' | 'pl';
type Role = 'admin';

type AdminJWT = JWT & { role?: Role };

const SUPPORTED_LOCALES: ReadonlySet<Locale> = new Set(['en', 'pl']);

function extractTopSegment(pathname: string): string | null {
  const m = pathname.match(/^\/([^/]+)/);
  return m ? m[1] : null;
}

function normalizeLocale(raw: string | null): Locale {
  return raw === 'pl' || raw === 'en' ? raw : 'en';
}

function pickLocale(req: NextRequest): Locale {
  const header = (req.headers.get('accept-language') ?? '').toLowerCase();
  return header.includes('pl') ? 'pl' : 'en';
}

function isStaticOrSeoPath(pathname: string): boolean {
  if (pathname === '/' || pathname.startsWith('/sitemap')) return true;
  if (pathname.startsWith('/.well-known')) return true;

  // ✅ IMPORTANT: allow login/auth pages to avoid redirect loops
  if (/^\/(en|pl)\/login(\/|$)/.test(pathname)) return true;
  if (/^\/(en|pl)\/auth(\/|$)/.test(pathname)) return true;

  if (
    pathname.startsWith('/images') ||
    pathname.startsWith('/flags') ||
    pathname.startsWith('/upload')
  ) {
    return true;
  }

  if (/^\/google[a-z0-9]+\.html$/i.test(pathname)) return true;
  if (pathname.startsWith('/api')) return true;
  if (pathname.startsWith('/_next')) return true;

  return false;
}

function isAdminPath(pathname: string): boolean {
  return /^\/(en|pl)\/admin(\/|$)/.test(pathname);
}

function isAdminToken(token: JWT | null): token is AdminJWT {
  return !!token && token.role === 'admin';
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};

export default async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // 1) let static/seo/api paths pass
  if (isStaticOrSeoPath(pathname)) {
    return NextResponse.next();
  }

  // ✅ fix bad cached urls: /en/undefined/... or /pl/undefined/...
  if (/^\/(en|pl)\/undefined(\/|$)/.test(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace(/^\/(en|pl)\/undefined/, '/$1');
    return NextResponse.redirect(url, 308);
  }

  // 2) locale redirect if not prefixed
  const first = extractTopSegment(pathname);
  const hasSupportedLocale =
    first !== null && SUPPORTED_LOCALES.has(first as Locale);

  if (!hasSupportedLocale) {
    const url = req.nextUrl.clone();
    const locale = pickLocale(req);
    url.pathname = `/${locale}${pathname}`;
    return NextResponse.redirect(url, 308);
  }

  // 3) admin guard (must be admin)
  if (isAdminPath(pathname)) {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    });

    if (!isAdminToken(token)) {
      const locale = normalizeLocale(extractTopSegment(pathname));
      const url = req.nextUrl.clone();
      url.pathname = `/${locale}/login`;
      return NextResponse.redirect(url, 307);
    }
  }

  return NextResponse.next();
}
