'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type {
  ArticleEditable,
  ArticleFromApi,
  Locale,
  PageKey,
  ArticleStatus,
} from '@/types/core/article';

const ArticleEditor = dynamic(
  () => import('@/app/components/ArticleEditor'),
  { ssr: false },
);

interface FetchState {
  loading: boolean;
  error: string | null;
  article: ArticleEditable | null;
}

interface RouteParams extends Record<string, string> {
  slug: string;
  locale: string;
}

function pickStringLocale(value: unknown, loc: string): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const rec = value as Record<string, unknown>;
    const get = (k: string) => {
      const v = rec[k];
      return typeof v === 'string' ? v : undefined;
    };
    return get(loc) ?? get('en') ?? (Object
      .values(rec)
      .find(v => typeof v === 'string') as string | undefined);
  }
  return undefined;
}

function toLocaleRecord(
  value: string | Record<string, string> | undefined,
): Record<'en' | 'pl', string> {
  if (typeof value === 'string') {
    return { en: value, pl: value };
  }
  return {
    en: value?.en || '',
    pl: value?.pl || '',
  };
}

function normalize(api: ArticleFromApi, loc: Locale): ArticleEditable {
  if (!api.slug) throw new Error('Article payload missing slug');

  const legacyPages = ['blog', 'news', 'guides', 'docs'];
  const apiPage = (api.page ?? api.pageKey) as string | undefined;
  const pageKey: PageKey =
    (api.pageKey as PageKey) ||
    (apiPage && legacyPages.includes(apiPage) ? (apiPage as PageKey) : 'blog');

  const status: ArticleStatus =
    api.status === 'draft' || api.status === 'published' ? api.status : 'draft';

  const description =
    pickStringLocale(api.excerpt, loc) ||
    pickStringLocale(api.meta?.description, loc) ||
    undefined;

  const contentHtml =
    typeof api.contentHtml === 'string'
      ? api.contentHtml
      : pickStringLocale(api.content, loc) || '';

  const categories = api.categoryId
    ? [api.categoryId]
    : Array.isArray(api.categoryIds)
    ? api.categoryIds
    : undefined;

  return {
    slug: api.slug,
    title: toLocaleRecord(api.title),
    description,
    contentHtml,
    contentRaw: toLocaleRecord(api.content), // ← سنستعمل هذا في الـEditor
    locale: loc,
    pageKey,
    status,
    categories,
    heroImageUrl:
      (api as Record<string, unknown>).coverUrl as string ||
      (api as Record<string, unknown>).heroImageUrl as string,
    thumbnailUrl: api.thumbnailUrl,
    scheduledFor: api.scheduledFor,
    meta: api.meta,
  };
}

export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams<RouteParams>();

  const slug = params?.slug ?? '';
  const locale: Locale = params?.locale === 'pl' ? 'pl' : 'en';

  const [state, setState] = useState<FetchState>({
    loading: true,
    error: null,
    article: null,
  });

  const t = (en: string, pl: string) => (locale === 'pl' ? pl : en);

  const load = useCallback(() => {
    if (!slug) return;
    const controller = new AbortController();
    setState(prev => ({ ...prev, loading: true, error: null }));

    (async () => {
      try {
        const res = await fetch(
          `/api/admin/articles/${encodeURIComponent(slug)}/edit`,
          { cache: 'no-store', signal: controller.signal },
        );
        let json: unknown;
        try {
          json = await res.json();
        } catch {
          throw new Error('Invalid JSON');
        }
        if (!res.ok) {
          const msg =
            typeof json === 'object' &&
            json !== null &&
            'error' in json &&
            typeof (json as { error?: unknown }).error === 'string'
              ? (json as { error: string }).error
              : `HTTP ${res.status}`;
          throw new Error(msg);
        }
        if (typeof json !== 'object' || json === null) {
          throw new Error('Malformed payload');
        }
        const editable = normalize(json as ArticleFromApi, locale);
        setState({ loading: false, error: null, article: editable });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setState({
          loading: false,
          error: err instanceof Error ? err.message : 'Error',
          article: null,
        });
      }
    })();

    return () => controller.abort();
  }, [slug, locale]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSaved() {
    router.push(`/${locale}/admin/articles`);
  }

  // أزرار محسّنة
  const btnPrimary =
    'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/20 hover:shadow-violet-600/30 hover:scale-[1.01] active:scale-[.99] transition-all';
  const btnSecondary =
    'inline-flex items-center gap-2 rounded-xl px-4 py-2 border border-zinc-300/70 dark:border-zinc-700/70 bg-white/70 dark:bg-zinc-900/50 backdrop-blur hover:bg-white dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-sm';

  if (!slug) {
    return (
      <p className="p-6 text-red-500">
        {t('Invalid slug', 'Niepoprawny slug')}
      </p>
    );
  }

  if (state.loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-6">
          {t('Edit Article', 'Edytuj artykuł')}
        </h1>
        <div className="space-y-4 animate-pulse">
          <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
      </main>
    );
  }

  if (state.error) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16 space-y-6">
        <h1 className="text-2xl font-bold">
          {t('Edit Article', 'Edytuj artykuł')}
        </h1>
        <p className="text-red-500 text-sm">{state.error}</p>
        <button onClick={load} className={btnPrimary}>
          {t('Retry', 'Spróbuj ponownie')}
        </button>
      </main>
    );
  }

  if (!state.article) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold mb-4">
          {t('Edit Article', 'Edytuj artykuł')}
        </h1>
        <p className="text-red-500">
          {t('Article not found.', 'Artykuł nie znaleziony.')}
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <header className="flex flex-wrap gap-4 justify-between items-center">
        <h1 className="text-2xl font-bold">
          {t('Edit Article', 'Edytuj artykuł')} — {state.article.slug}
        </h1>
        <div className="flex gap-3">
          <a href={`/${locale}/admin/articles`} className={btnSecondary}>
            {t('Back', 'Powrót')}
          </a>
          {state.article.status === 'published' && (
            <a
              href={`/${locale}/articles/${state.article.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={btnPrimary}
            >
              {t('View', 'Podgląd')}
            </a>
          )}
        </div>
      </header>

      <ArticleEditor
        mode="edit"
        locale={locale}
        defaultData={{
          slug: state.article.slug,
          title: {
            en: state.article.title.en ?? '',
            pl: state.article.title.pl ?? '',
          },
          excerpt: {
            en: state.article.description?.toString() ?? '',
            pl: state.article.description?.toString() ?? '',
          },
          // ✅ هذا يضمن تعبئة النص القديم
          content: state.article.contentRaw,
          categoryId: state.article.categories?.[0] || '',
          coverUrl: state.article.heroImageUrl,
          videoUrl: undefined,
          meta: state.article.meta,
        }}
        onSaved={handleSaved}
      />
    </main>
  );
}
