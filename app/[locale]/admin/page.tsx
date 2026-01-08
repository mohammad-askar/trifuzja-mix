// app/[locale]/admin/page.tsx
import { redirect } from 'next/navigation';

type Locale = 'en' | 'pl';

function normalizeLocale(raw: unknown): Locale {
  return raw === 'pl' || raw === 'en' ? raw : 'en';
}

export default async function AdminAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = normalizeLocale(raw);
  redirect(`/${locale}/admin/dashboard`);
}
