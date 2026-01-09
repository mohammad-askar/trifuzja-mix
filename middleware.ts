// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

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

  // ✅ allow login page
  if (/^\/(en|pl)\/login(\/|$)/.test(pathname)) return true;

  // ✅ allow auth endpoints
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

export default auth((req) => {
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

  // ✅ admin guard: use req.auth (v5)
  if (isAdminPath(pathname) && !req.auth) {
    const locale = normalizeLocale(extractTopSegment(pathname));
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url, 307);
  }

  return NextResponse.next();
});
