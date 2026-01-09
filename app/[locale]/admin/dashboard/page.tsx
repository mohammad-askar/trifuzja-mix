// app/[locale]/admin/dashboard/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { Home, FolderKanban, Newspaper } from 'lucide-react';

type Locale = 'en' | 'pl';

function normalizeLocale(raw: string): Locale {
  return raw === 'pl' || raw === 'en' ? raw : 'en';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = normalizeLocale(raw);
  const isPL = locale === 'pl';

  return {
    title: isPL ? 'Panel administracyjny | MENSITIVA' : 'Admin Dashboard | MENSITIVA',
    alternates: {
      languages: {
        en: '/en/admin/dashboard',
        pl: '/pl/admin/dashboard',
      },
    },
  };
}

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale: raw } = await params;
  const locale = normalizeLocale(raw);

  return (
    <main className="min-h-[calc(100vh-64px)] flex items-center justify-center">
      <div className="w-full max-w-4xl bg-gray-900/90 text-gray-200 rounded-xl shadow-lg p-8 border border-gray-700">
        <h1 className="text-3xl font-bold mb-8 text-center">Admin&nbsp;Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href={`/${locale}/admin/categories`}
            className="group overflow-hidden rounded-lg p-6 bg-gradient-to-br from-gray-800 to-gray-850 hover:from-blue-600/70 hover:to-blue-800/80 transition"
          >
            <FolderKanban className="w-10 h-10 text-blue-400 mb-4 group-hover:scale-105 transition-transform" />
            <h2 className="text-xl font-semibold mb-1">Manage&nbsp;Categories</h2>
            <p className="text-gray-400 group-hover:text-gray-200 transition-colors">
              Add, edit, or delete categories.
            </p>
          </Link>

          <Link
            href={`/${locale}/admin/articles`}
            className="group overflow-hidden rounded-lg p-6 bg-gradient-to-br from-gray-800 to-gray-850 hover:from-emerald-600/70 hover:to-emerald-800/80 transition"
          >
            <Newspaper className="w-10 h-10 text-emerald-400 mb-4 group-hover:scale-105 transition-transform" />
            <h2 className="text-xl font-semibold mb-1">Manage&nbsp;Articles</h2>
            <p className="text-gray-400 group-hover:text-gray-200 transition-colors">
              Add, edit, or delete articles.
            </p>
          </Link>
        </div>

        <div className="mt-10 text-center">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition"
          >
            <Home className="w-4 h-4" />
            Back&nbsp;to&nbsp;site
          </Link>
        </div>
      </div>
    </main>
  );
}
