// proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken, type JWT } from "next-auth/jwt";

type AppJWT = JWT & { role?: "admin" | "editor" | "user" };

function isAppJWT(token: JWT | null): token is AppJWT {
  return (
    !!token &&
    (typeof (token as Record<string, unknown>).role === "string" ||
      !("role" in (token as object)))
  );
}

const SUPPORTED_LOCALES = new Set(["en", "pl"]);

function extractTopSegment(pathname: string): string | null {
  const m = pathname.match(/^\/([^/]+)/);
  return m ? m[1] : null;
}

function isStaticOrSeoPath(pathname: string): boolean {
  if (pathname === "/" || pathname.startsWith("/sitemap")) return true;
  if (pathname.startsWith("/.well-known")) return true;
  if (
    pathname.startsWith("/images") ||
    pathname.startsWith("/flags") ||
    pathname.startsWith("/upload")
  )
    return true;
  if (/^\/google[a-z0-9]+\.html$/i.test(pathname)) return true;
  if (pathname.startsWith("/api")) return true;
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

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // let static/seo paths pass
  if (isStaticOrSeoPath(pathname)) {
    return NextResponse.next();
  }

  // locale redirect if not prefixed
  const first = extractTopSegment(pathname);
  const hasSupportedLocale = first !== null && SUPPORTED_LOCALES.has(first);
  if (!hasSupportedLocale) {
    const url = req.nextUrl.clone();
    url.pathname = `/en${pathname}`;
    return NextResponse.redirect(url, 308);
  }

  // admin guard
  if (isAdminPath(pathname)) {
    const raw = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const token: AppJWT | null = isAppJWT(raw) ? raw : null;

    if (token?.role !== "admin") {
      const locale = extractTopSegment(pathname) ?? "en";
      const url = req.nextUrl.clone();
      url.pathname = `/${locale}/login`;
      return NextResponse.redirect(url, 307);
    }
  }

  return NextResponse.next();
}
