// app/[locale]/admin/categories/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/authOptions';
import CategoriesAdminClient from '@/app/components/CategoriesAdminClient';

export default async function AdminCatsPage(
  { params }: { params: Promise<{ locale: 'en' | 'pl' }> },
) {
  // 1) فكّ الـ params
  const { locale } = await params;

  // 2) تحقّق الصلاحيات
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(`/${locale}/login`);
  }

  // 3) مرّر اللغة للعميل
  return <CategoriesAdminClient locale={locale} />;
}
