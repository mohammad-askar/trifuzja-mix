// app/[locale]/admin/categories/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import CategoriesAdminClient from '@/app/components/CategoriesAdminClient';

type Locale = 'en' | 'pl';
type Role = 'admin' | 'user';

function normalizeLocale(raw: unknown): Locale {
  return raw === 'pl' || raw === 'en' ? raw : 'en';
}

function isAdminRole(role: unknown): boolean {
  return role === 'admin';
}

async function requireAdminOrRedirect(locale: Locale): Promise<void> {
  const session = await auth();

  if (!session?.user) redirect(`/${locale}/login`);

  const role =
    typeof session.user === 'object' && session.user && 'role' in session.user
      ? (session.user as { role?: Role | string | null }).role
      : undefined;

  if (!isAdminRole(role)) redirect(`/${locale}/login`);
}

export default async function AdminCatsPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await props.params; // ✅ unwrap
  const locale = normalizeLocale(raw);

  await requireAdminOrRedirect(locale);

  return <CategoriesAdminClient locale={locale} />;
}
