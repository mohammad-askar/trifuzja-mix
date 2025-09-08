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

/* استخراج نص من قيمة قد تكون string أو خريطة لغات */
function pickStringLocale(
  value: string | Record<string, string> | undefined,
  loc: string,
): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  return value[loc] || value['en'] || Object.values(value)[0];
}

/* تحويل استجابة API قديمة إلى ArticleEditable */
function toLocaleRecord(value: string | Record<string, string> | undefined): Record<'en' | 'pl', string> {
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

  const pageKey: PageKey =
    (api.pageKey as PageKey) ||
    (['blog', 'news', 'guides', 'docs'].includes(api.page || '')
      ? (api.page as PageKey)
      : 'blog');

  // ضبط حالة المقال فقط على draft أو published
  const validStatuses = ['draft', 'published'] as const;
  const status: ArticleStatus = validStatuses.includes(api.status as any)
    ? (api.status as ArticleStatus)
    : 'draft';

  const title = toLocaleRecord(api.title || api.slug);

  // نستخدم excerpt أو meta.description فقط
  const excerptSource = api.excerpt ?? api.meta?.description;

  const description: string =
    pickStringLocale(excerptSource, loc) || '';

  const contentRaw = toLocaleRecord(
    typeof api.content === 'string' ? api.content : pickStringLocale(api.content, loc) || ''
  );

  const categories =
    api.categoryId
      ? [api.categoryId]
      : Array.isArray(api.categoryIds)
      ? api.categoryIds
      : undefined;

  return {
    slug: api.slug,
    title,
    description,
    contentHtml: typeof api.contentHtml === 'string' ? api.contentHtml : pickStringLocale(api.content, loc) || '',
    contentRaw,
    locale: loc,
    pageKey,
    status,
    categories,
    tags: api.tags,
    heroImageUrl: api.coverUrl || api.heroImageUrl,
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
          `/api/admin/articles/${encodeURIComponent(slug)}`,
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
        <button
          onClick={load}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium"
        >
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

  function normalizeStatus(status: ArticleStatus): 'draft' | 'published' {
    return status === 'published' ? 'published' : 'draft';
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <header className="flex flex-wrap gap-4 justify-between items-center">
        <h1 className="text-2xl font-bold">
          {t('Edit Article', 'Edytuj artykuł')} — {state.article.slug}
        </h1>
        <div className="flex gap-3">
          <a
            href={`/${locale}/admin/articles`}
            className="px-4 py-2 rounded bg-zinc-700 text-white hover:bg-zinc-600 text-sm"
          >
            {t('Back', 'Powrót')}
          </a>
          {state.article.status === 'published' && (
            <a
              href={`/${locale}/articles/${state.article.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
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
    ...state.article,
    title: toLocaleRecord(state.article.title),
    excerpt: toLocaleRecord(state.article.description),  // استبدال excerpt بـ description
    content: toLocaleRecord(state.article.contentRaw),
    status: normalizeStatus(state.article.status),
  }}
  onSaved={handleSaved}
/>
    </main>
  );
}
