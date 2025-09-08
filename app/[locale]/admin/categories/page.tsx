// المسار: /app/[locale]/admin/categories/page.tsx
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import CategoriesAdminClient from '@/app/components/CategoriesAdminClient';

/**
 * صفحة إدارة التصنيفات
 * Next 15+ يمرّر `params` كـ Promise لذا نستعمل `await` لفكّه.
 */
export default async function AdminCatsPage(
  { params }: { params: Promise<{ locale: 'en' | 'pl' }> },
) {
  /* 1️⃣ فكّ الباراميترات */
  const { locale } = await params;            // ← أهمّ سطر: await params

  /* 2️⃣ تحقّق صلاحيات المشرف */
  const session = await getServerSession(authOptions);
  if (!session) redirect(`/${locale}/login`);

  /* 3️⃣ تسليم العميل */
  return <CategoriesAdminClient locale={locale} />;
}
