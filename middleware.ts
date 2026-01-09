// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

type Locale = "en" | "pl";
const SUPPORTED_LOCALES: ReadonlySet<Locale> = new Set(["en", "pl"]);

function extractTopSegment(pathname: string): string | null {
  const m = pathname.match(/^\/([^/]+)/);
  return m ? m[1] : null;
}
function normalizeLocale(raw: string | null): Locale {
  return raw === "pl" || raw === "en" ? raw : "en";
}
function pickLocale(req: NextRequest): Locale {
  const header = (req.headers.get("accept-language") ?? "").toLowerCase();
  return header.includes("pl") ? "pl" : "en";
}
function isStaticOrSeoPath(pathname: string): boolean {
  if (pathname === "/" || pathname.startsWith("/sitemap")) return true;
  if (pathname.startsWith("/.well-known")) return true;

  // ✅ allow login
  if (/^\/(en|pl)\/login(\/|$)/.test(pathname)) return true;

  // ✅ allow auth endpoints (important)
  if (pathname.startsWith("/api/auth")) return true;

  if (
    pathname.startsWith("/images") ||
    pathname.startsWith("/flags") ||
    pathname.startsWith("/upload")
  ) return true;

  if (/^\/google[a-z0-9]+\.html$/i.test(pathname)) return true;
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/_next")) return true;

  return false;
}
function isAdminPath(pathname: string): boolean {
  return /^\/(en|pl)\/admin(\/|$)/.test(pathname);
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};

async function readAuthToken(req: NextRequest) {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  const isProd = process.env.NODE_ENV === "production";

  // Auth.js v5 cookie names:
  const authjsCookie = isProd ? "__Secure-authjs.session-token" : "authjs.session-token";

  // (fallback if something still uses older naming)
  const nextAuthCookie = isProd ? "__Secure-next-auth.session-token" : "next-auth.session-token";

  // Try Auth.js cookie first, then fallback
  return (
    (await getToken({ req, secret, cookieName: authjsCookie })) ??
    (await getToken({ req, secret, cookieName: nextAuthCookie }))
  );
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isStaticOrSeoPath(pathname)) return NextResponse.next();

  // fix /en/undefined/...
  if (/^\/(en|pl)\/undefined(\/|$)/.test(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace(/^\/(en|pl)\/undefined/, "/$1");
    return NextResponse.redirect(url, 308);
  }

  // locale redirect if missing
  const first = extractTopSegment(pathname);
  const hasSupportedLocale = first !== null && SUPPORTED_LOCALES.has(first as Locale);

  if (!hasSupportedLocale) {
    const url = req.nextUrl.clone();
    const locale = pickLocale(req);
    url.pathname = `/${locale}${pathname}`;
    return NextResponse.redirect(url, 308);
  }

  // ✅ admin guard
  if (isAdminPath(pathname)) {
    const token = await readAuthToken(req);

    if (!token) {
      const locale = normalizeLocale(extractTopSegment(pathname));
      const url = req.nextUrl.clone();
      url.pathname = `/${locale}/login`;
      return NextResponse.redirect(url, 307);
    }
  }

  return NextResponse.next();
}
