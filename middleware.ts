// E:\trifuzja-mix\middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

type Locale = "en" | "pl";
const SUPPORTED_LOCALES: ReadonlySet<Locale> = new Set(["en", "pl"]);

function extractTopSegment(pathname: string): string | null {
  const m = pathname.match(/^\/([^/]+)/);
  return m ? m[1] : null;
}

function pickLocale(req: NextRequest): Locale {
  const header = (req.headers.get("accept-language") ?? "").toLowerCase();
  return header.includes("pl") ? "pl" : "en";
}

function isStaticOrSeoPath(pathname: string): boolean {
  if (pathname === "/" || pathname.startsWith("/sitemap")) return true;
  if (pathname.startsWith("/.well-known")) return true;

  if (
    pathname.startsWith("/images") ||
    pathname.startsWith("/flags") ||
    pathname.startsWith("/upload")
  ) {
    return true;
  }

  // Google verification file
  if (/^\/google[a-z0-9]+\.html$/i.test(pathname)) return true;

  // Allow auth + any API routes
  if (pathname.startsWith("/api")) return true;

  // Next internals
  if (pathname.startsWith("/_next")) return true;

  return false;
}

function isAdminPath(pathname: string): boolean {
  if (pathname === "/admin") return true;
  return /^\/(en|pl)\/admin(\/|$)/.test(pathname);
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};

export default async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // 1) let static/seo/api paths pass
  if (isStaticOrSeoPath(pathname)) {
    return NextResponse.next();
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

  // 3) admin guard (Admin-only: just require token)
  if (isAdminPath(pathname)) {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      const locale = (extractTopSegment(pathname) as Locale) ?? "en";
      const url = req.nextUrl.clone();
      url.pathname = `/${locale}/login`;
      return NextResponse.redirect(url, 307);
    }
  }

  return NextResponse.next();
}
