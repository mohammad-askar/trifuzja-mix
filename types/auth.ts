// E:\trifuzja-mix\types\auth.ts
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

/**
 * تتحقق أنّ الجلسة موجودة وصلاحية المستخدم 'admin'.
 * ترمي خطأ إذا لم يكن كذلك.
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    // نرمي خطأ لتتم معالجته في catch بالمسارات
    throw new Error('Unauthorized');
  }
}

/**
 * تستخدم في Middleware لمنع الوصول للـ /admin/** للغير مصرح لهم.
 * ترجع NextResponse.redirect لو لم يكن admin.
 */
export async function checkAdminAccess(req: Request) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user.role === 'admin';
  if (!isAdmin) {
    const url = new URL('/login', req.url);
    return NextResponse.redirect(url);
  }
  return null;
}
