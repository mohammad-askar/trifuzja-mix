// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ استثناء robots.txt و sitemap.xml من أي إعادة توجيه للغات
  if (pathname === '/robots.txt' || pathname === '/sitemap.xml') {
    return NextResponse.next();
  }

  // 🟡 إعادة التوجيه إلى اللغة الافتراضية إن لم يتم تحديدها
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
    const locale = 'en';
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, req.url));
  }

  // 🛡️ حماية لوحات التحكم /admin
  if (pathname.startsWith('/admin')) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || token.role !== 'admin') {
      const loginUrl = new URL('/login', req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// 👇 فعّل الميدل وير على كل الروابط
export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};
