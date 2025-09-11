// E:\trifuzja-mix\types\auth.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions'; // ⬅️ بدل مسار الراوت إلى lib
import { NextResponse } from 'next/server';

/**
 * تتحقق أنّ الجلسة موجودة وصلاحية المستخدم 'admin'.
 * ترمي خطأ إذا لم يكن كذلك.
 */
export async function requireAdmin(): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    throw new Error('Unauthorized');
  }
}

/**
 * تستخدم في Middleware/راوتات لحجب /admin/** لغير المصرح لهم.
 * ترجع Redirect لو لم يكن admin.
 */
export async function checkAdminAccess(req: Request): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user.role === 'admin';
  if (!isAdmin) {
    const url = new URL('/login', req.url);
    return NextResponse.redirect(url);
  }
  return null;
}
