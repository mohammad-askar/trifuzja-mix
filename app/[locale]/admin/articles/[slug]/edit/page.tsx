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
import { ArrowLeft, Eye, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDelete from '@/app/components/ConfirmDelete';

const ArticleEditor = dynamic(() => import('@/app/components/ArticleEditor'), {
  ssr: false,
});

interface FetchState {
  loading: boolean;
  error: string | null;
  article: ArticleEditable | null;
}

interface RouteParams extends Record<string, string> {
  slug: string;
  locale: string;
}

/* ---------- helpers ---------- */

function pickStringLocale(value: unknown, loc: string): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const rec = value as Record<string, unknown>;
    const take = (k: string) => {
      const v = rec[k];
      return typeof v === 'string' && v.trim() ? v : undefined;
    };
    return take(loc) ?? take('pl') ?? take('en') ?? (Object.values(rec).find(v => typeof v === 'string') as string | undefined);
  }
  return undefined;
}

/** Ensure we always return a {en, pl} record, duplicating when needed. */
function toLocaleRecord(
  value: string | Record<string, string> | undefined,
  fallback?: string,
): Record<'en' | 'pl', string> {
  if (typeof value === 'string') {
    const v = value ?? '';
    return { en: v, pl: v };
  }
  const en = value?.en ?? fallback ?? '';
  const pl = value?.pl ?? fallback ?? en;
  return { en, pl };
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

  // Title / Excerpt can be string or record — normalize to {en, pl}
  const titleRec = toLocaleRecord(api.title);

  // Content can be record or string; if only contentHtml exists, duplicate to both
  const contentHtml =
    typeof api.contentHtml === 'string'
      ? api.contentHtml
      : pickStringLocale(api.content, loc) || '';

  const contentRecRaw =
    typeof api.content === 'string' || (api.content && typeof api.content === 'object')
      ? toLocaleRecord(api.content as string | Record<string, string>)
      : toLocaleRecord(undefined, contentHtml);

  const categories = api.categoryId
    ? [api.categoryId]
    : Array.isArray(api.categoryIds)
    ? api.categoryIds
    : undefined;

  return {
    slug: api.slug,
    title: titleRec,
    description: pickStringLocale(api.excerpt, loc) ?? pickStringLocale(api.meta?.description, loc),
    contentHtml,                 // string (for live preview if your editor uses it)
    contentRaw: contentRecRaw,   // {en, pl} — always populated
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

/* ---------- page ---------- */

export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams<RouteParams>();

  const slug = params?.slug ?? '';
  const locale: Locale = params?.locale === 'pl' ? 'pl' : 'en';
  const listUrl = `/${locale}/admin/articles`;

  const [state, setState] = useState<FetchState>({
    loading: true,
    error: null,
    article: null,
  });

  const [dlgOpen, setDlgOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const t = (enText: string, plText: string) => (locale === 'pl' ? plText : enText);

  const load = useCallback(() => {
    if (!slug) return;
    const controller = new AbortController();
    setState(prev => ({ ...prev, loading: true, error: null }));

    (async () => {
      try {
        const res = await fetch(`/api/admin/articles/${encodeURIComponent(slug)}/edit`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const json = (await res.json().catch(() => null)) as unknown;
        if (!res.ok || !json || typeof json !== 'object') {
          const msg =
            (json && 'error' in (json as Record<string, unknown>) && typeof (json as { error?: unknown }).error === 'string'
              ? (json as { error: string }).error
              : `HTTP ${res.status}`) || 'Invalid response';
          throw new Error(msg);
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

  async function handleDelete() {
    if (!state.article) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/articles/${encodeURIComponent(state.article.slug)}`, {
        method: 'DELETE',
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      toast.success(t('Article deleted.', 'Usunięto artykuł.'));
      router.push(listUrl);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('Delete failed', 'Błąd usuwania'));
    } finally {
      setDeleting(false);
    }
  }

  const btn = {
    ghost:
      'inline-flex items-center gap-2 rounded-lg px-3 py-2 border border-zinc-300/80 dark:border-zinc-700/70 bg-white/80 dark:bg-zinc-900/60 text-zinc-800 dark:text-zinc-100 hover:bg-white dark:hover:bg-zinc-800 transition',
    danger:
      'inline-flex items-center gap-2 rounded-lg px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md hover:shadow-lg active:scale-[.99] transition',
    icon:
      'inline-flex items-center gap-2 rounded-lg p-2 border border-zinc-300/80 dark:border-zinc-700/70 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition',
  } as const;

  if (!slug) {
    return <p className="p-6 text-red-500">{t('Invalid slug', 'Niepoprawny slug')}</p>;
  }

  if (state.loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-6">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
          <h1 className="text-2xl font-semibold">{t('Loading article…', 'Ładowanie artykułu…')}</h1>
        </div>
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
        <h1 className="text-2xl font-bold">{t('Edit Article', 'Edytuj artykuł')}</h1>
        <p className="text-red-500 text-sm">{state.error}</p>
        <button onClick={load} className={btn.ghost}>
          {t('Retry', 'Spróbuj ponownie')}
        </button>
      </main>
    );
  }

  if (!state.article) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold mb-4">{t('Edit Article', 'Edytuj artykuł')}</h1>
        <p className="text-red-500">{t('Article not found.', 'Artykuł nie znaleziony.')}</p>
      </main>
    );
  }

  const { article } = state;

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* top bar */}
      <header className="sticky top-16 z-10 -mx-4 px-4 py-3 bg-white/85 dark:bg-zinc-900/85 backdrop-blur border-b border-zinc-200/70 dark:border-zinc-800/60">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(listUrl)} className={btn.icon} title={t('Back', 'Powrót')}>
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-lg md:text-xl font-semibold">
              {t('Edit Article', 'Edytuj artykuł')}{' '}
              <span className="text-zinc-500">— {article.slug}</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {article.status === 'published' && (
              <a
                href={`/${locale}/articles/${article.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className={btn.ghost}
              >
                <Eye className="w-4 h-4" />
                {t('View', 'Podgląd')}
              </a>
            )}

            <button onClick={() => setDlgOpen(true)} className={btn.danger}>
              <Trash2 className="w-4 h-4" />
              {t('Delete', 'Usuń')}
            </button>
          </div>
        </div>
      </header>

      {/* editor */}
      <ArticleEditor
        mode="edit"
        locale={locale}
        defaultData={{
          slug: article.slug,
          title: {
            en: article.title.en ?? '',
            pl: article.title.pl ?? '',
          },
          excerpt: {
            en: article.description?.toString() ?? '',
            pl: article.description?.toString() ?? '',
          },
          // Always provide both languages. If API didn’t have content,
          // we already duplicated contentHtml above.
          content: {
  en: article.contentRaw?.en ?? article.contentHtml ?? '',
  pl: article.contentRaw?.pl ?? article.contentHtml ?? '',
},
          categoryId: article.categories?.[0] || '',
          coverUrl: article.heroImageUrl,
          videoUrl: undefined,
          meta: article.meta,
        }}
        onSaved={() => router.push(listUrl)}
      />

      <ConfirmDelete
        open={dlgOpen}
        setOpen={setDlgOpen}
        onConfirm={handleDelete}
        title={t('Confirm deletion', 'Potwierdź usunięcie')}
        message={`${t('Are you sure you want to delete this article?', 'Czy na pewno chcesz usunąć ten artykuł?')} (${article.slug})`}
        cancelLabel={t('Cancel', 'Anuluj')}
        deleteLabel={deleting ? t('Deleting…', 'Usuwanie…') : t('Delete', 'Usuń')}
      />
    </main>
  );
}
