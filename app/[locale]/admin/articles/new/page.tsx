// app/[locale]/admin/articles/new/page.tsx
'use client';

import React, { Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

/* ------------------------- Dynamic ArticleEditor ------------------------- */
const ArticleEditor = dynamic(() => import('@/app/components/ArticleEditor'), {
  ssr: false,
});

/* --------------------------------- i18n --------------------------------- */
const LOCALES = ['en', 'pl'] as const;
type Locale = (typeof LOCALES)[number];

function isLocale(x: unknown): x is Locale {
  return typeof x === 'string' && (LOCALES as readonly string[]).includes(x);
}

const TEXTS: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    login: string;
    loginLink: string;
    loading: string;
    unauthorized: string;
    backToList: string;
    goToLogin: string;
    editorLoading: string;
    errorLoading: string;
  }
> = {
  en: {
    title: 'New Article',
    subtitle: 'Write your article, add a cover and save.',
    login: 'You must ',
    loginLink: 'login',
    loading: 'Loading…',
    unauthorized: 'Unauthorized – ask an admin to upgrade your role.',
    backToList: 'Back to articles',
    goToLogin: 'Go to login',
    editorLoading: 'Preparing the editor…',
    errorLoading: 'Something went wrong while loading the editor.',
  },
  pl: {
    title: 'Nowy artykuł',
    subtitle: 'Napisz artykuł, dodaj okładkę i zapisz.',
    login: 'Musisz się ',
    loginLink: 'zalogować',
    loading: 'Ładowanie…',
    unauthorized: 'Brak uprawnień – poproś admina o wyższy poziom.',
    backToList: 'Powrót do artykułów',
    goToLogin: 'Przejdź do logowania',
    editorLoading: 'Trwa przygotowywanie edytora…',
    errorLoading: 'Wystąpił błąd podczas ładowania edytora.',
  },
};

/* ----------------------------- UI Components ---------------------------- */
function EditorSkeleton({ hint }: { hint: string }) {
  return (
    <div
      className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white/60 dark:bg-zinc-900/60 p-4 md:p-6 animate-pulse"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{hint}</span>

      {/* Title */}
      <div className="h-10 w-3/4 rounded-md bg-gray-100 dark:bg-zinc-800" />
      <div className="mt-2 h-3 w-24 rounded bg-gray-100 dark:bg-zinc-800" />

      {/* Excerpt */}
      <div className="mt-4 h-20 w-full rounded-md bg-gray-100 dark:bg-zinc-800" />

      {/* Short controls */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="h-10 rounded-md bg-gray-100 dark:bg-zinc-800" />
        <div className="h-10 rounded-md bg-gray-100 dark:bg-zinc-800" />
      </div>

      {/* Rich editor area */}
      <div className="mt-4 h-60 w-full rounded-lg border border-dashed border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900" />

      {/* Cover uploader */}
      <div className="mt-4 h-28 w-full rounded-lg border-2 border-dashed border-gray-200 dark:border-zinc-700" />

      {/* Action bar */}
      <div className="mt-6 h-9 w-48 rounded-md bg-gray-100 dark:bg-zinc-800" />
    </div>
  );
}

function PageHeader({
  title,
  subtitle,
  backHref,
  backText,
}: {
  title: string;
  subtitle: string;
  backHref: string;
  backText: string;
}) {
  return (
    <header className="mb-6">
      <nav className="mb-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <span aria-hidden>←</span>
          {backText}
        </Link>
      </nav>
      <h1 className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-3xl font-semibold tracking-tight text-transparent dark:from-blue-400 dark:to-cyan-400">
        {title}
      </h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
    </header>
  );
}

function Notice({
  tone = 'error',
  children,
  actionHref,
  actionLabel,
}: {
  tone?: 'error' | 'info';
  children: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
}) {
  const base = 'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm';
  const toneMap = {
    error:
      'border-red-200/60 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/30 text-red-800 dark:text-red-200',
    info:
      'border-blue-200/60 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200',
  } as const;

  return (
    <div role="alert" className={`${base} ${toneMap[tone]}`}>
      <div className="mt-0.5">⚠️</div>
      <div className="flex-1">
        {children}
        {actionHref && actionLabel && (
          <div className="mt-2">
            <Link
              href={actionHref}
              className="inline-flex items-center gap-1 underline underline-offset-2 hover:no-underline"
            >
              {actionLabel} →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Page --------------------------------- */
export default function NewArticlePage() {
  // Locale from route params
  const params = useParams();
  const raw = typeof params?.locale === 'string' ? params.locale : undefined;
  const locale: Locale = isLocale(raw) ? raw : 'en';

  const {
    title,
    subtitle,
    login,
    loginLink,
    loading,
    unauthorized,
    backToList,
    goToLogin,
    editorLoading,
  } = TEXTS[locale];

  const router = useRouter();

  /* Session & roles */
  const { data: session, status } = useSession();
  const role = session?.user?.role as 'admin' | 'editor' | 'viewer' | undefined;

  // Loading session
  if (status === 'loading') {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <PageHeader
          title={title}
          subtitle={subtitle}
          backHref={`/${locale}/admin/articles`}
          backText={backToList}
        />
        <EditorSkeleton hint={loading} />
      </main>
    );
  }

  // Not logged in
  if (!session) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader
          title={title}
          subtitle={subtitle}
          backHref={`/${locale}/admin/articles`}
          backText={backToList}
        />
        <Notice tone="error" actionHref={`/${locale}/login`} actionLabel={goToLogin}>
          {login}
          <Link className="underline underline-offset-2" href={`/${locale}/login`}>
            {loginLink}
          </Link>
          .
        </Notice>
      </main>
    );
  }

  // No permission
  if (role !== 'admin' && role !== 'editor') {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader
          title={title}
          subtitle={subtitle}
          backHref={`/${locale}/admin/articles`}
          backText={backToList}
        />
        <Notice tone="error">{unauthorized}</Notice>
      </main>
    );
  }

  // Page with editor
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        title={title}
        subtitle={subtitle}
        backHref={`/${locale}/admin/articles`}
        backText={backToList}
      />

      <section
        className="rounded-xl border border-gray-200 bg-white/70 dark:border-zinc-700 dark:bg-zinc-900/70"
        aria-labelledby="editor-section"
      >
        <h2 id="editor-section" className="sr-only">
          Editor
        </h2>

        {/* container for the editor */}
        <div className="editor-host rounded-lg">
          <Suspense fallback={<EditorSkeleton hint={editorLoading} />}>
            <ArticleEditor
              mode="create"
              locale={locale}
              // backend decides publishing; no page/status here
              defaultData={{
                slug: '',
                title: { en: '', pl: '' },
                excerpt: { en: '', pl: '' },
                content: { en: '', pl: '' },
                categoryId: '',
                coverUrl: undefined,
                videoUrl: undefined,
                meta: undefined,
              }}
              onSaved={(slug: string) =>
                router.push(`/${locale}/admin/articles/${slug}/edit`)
              }
            />
          </Suspense>
        </div>

        {/* Editor-specific global CSS overrides */}
        <style jsx global>{`
          /* hide page/status fields */
          .editor-host [data-field='page'],
          .editor-host [data-field='status'],
          .editor-host [name='page'],
          .editor-host [name='status'],
          .editor-host [aria-label='Page'],
          .editor-host [aria-label='Status'],
          .editor-host .page-toggle,
          .editor-host .status-toggle,
          .editor-host .btn-page,
          .editor-host .btn-status {
            display: none !important;
          }
          .editor-host fieldset.page,
          .editor-host fieldset.status {
            display: none !important;
          }

          /* toolbar sticky inside editor */
          .editor-host {
            position: relative;
            overflow: visible;
          }

          .editor-host [data-toolbar],
          .editor-host [role='toolbar'],
          .editor-host .editor-toolbar,
          .editor-host [class*='toolbar'] {
            position: sticky !important;
            top: 0;
            z-index: 30;
            background: rgba(255, 255, 255, 0.85);
            -webkit-backdrop-filter: saturate(120%) blur(6px);
            backdrop-filter: saturate(120%) blur(6px);
            border-bottom: 1px solid rgba(0, 0, 0, 0.06);
            inset: auto !important;
          }

          :root.dark .editor-host [data-toolbar],
          :root.dark .editor-host [role='toolbar'],
          :root.dark .editor-host .editor-toolbar,
          :root.dark .editor-host [class*='toolbar'] {
            background: rgba(24, 24, 27, 0.8);
            border-bottom-color: rgba(255, 255, 255, 0.08);
          }

          .editor-host .editor-content,
          .editor-host [data-editor-content] {
            scroll-margin-top: 56px;
            padding-top: 8px;
          }
        `}</style>
      </section>
    </main>
  );
}
