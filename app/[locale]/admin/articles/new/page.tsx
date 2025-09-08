// المسار: /app/[locale]/admin/articles/new/page.tsx
'use client';

import { Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

// محرّر المقالة يُحمَّل ديناميكياً (بدون SSR)
const ArticleEditor = dynamic(
  () => import('@/app/components/ArticleEditor'),
  { ssr: false, /*⬅️ يدعم Suspense*/ }
);

// رسائل الترجمة (EN / PL) في مكان واحد
const t = {
  en: {
    title: 'New Article',
    login: 'You must ',
    loginLink: 'login',
    loading: 'Loading...',
    unauthorized: 'Unauthorized – ask an admin to upgrade your role.',
  },
  pl: {
    title: 'Nowy artykuł',
    login: 'Musisz się ',
    loginLink: 'zalogować',
    loading: 'Ładowanie...',
    unauthorized: 'Brak uprawnień – poproś admina o wyższy poziom.',
  },
} as const;

export default function NewArticlePage() {
  /* --------------------------- Locale & helpers -------------------------- */
  const params = useParams() as { locale: 'en' | 'pl' };
  const { locale } = params;
  const { title, login, loginLink, loading, unauthorized } = t[locale];

  const router = useRouter();

  /* --------------------------- Session & roles --------------------------- */
  const { data: session, status } = useSession();

  // حالة انتظار التحقق من الجلسة
  if (status === 'loading') {
    return <p className="p-6">{loading}</p>;
  }

  // المستخدم غير مسجَّل دخول
  if (!session) {
    return (
      <p className="p-6 text-red-500">
        {login}
        <Link className="underline" href={`/${locale}/login`}>
          {loginLink}
        </Link>
        .
      </p>
    );
  }

  // السماح فقط لأدوار admin أو editor
  const role = session.user?.role as 'admin' | 'editor' | 'viewer' | undefined;
  if (role !== 'admin' && role !== 'editor') {
    return <p className="p-6 text-red-500">{unauthorized}</p>;
  }

  /* ----------------------------- الصفحة ---------------------------------- */
  return (
    <main className="max-w-4xl mx-auto px-4 py-10 ">
      <h1 className="text-2xl font-bold mb-6">{title}</h1>

      {/* Skeleton رقيق أثناء تحميل المحرر */}
      <Suspense
        fallback={
          <div className="h-72 rounded-lg border border-gray-200 dark:border-zinc-700 animate-pulse bg-gray-100 dark:bg-zinc-800" />
        }
      >
        <ArticleEditor
          mode="create"
          locale={locale}
          onSaved={(slug) => router.push(`/${locale}/admin/articles/${slug}/edit`)}
        />
      </Suspense>
    </main>
  );
}
