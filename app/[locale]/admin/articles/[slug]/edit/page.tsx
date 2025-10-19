// E:\trifuzja-mix\app\[locale]\admin\articles\[slug]\edit\page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type {
  ArticleEditable,
  ArticleFromApi,
  Locale,
} from '@/types/core/article';
import { ArrowLeft, Eye, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDelete from '@/app/components/ConfirmDelete';

const ArticleEditor = dynamic(() => import('@/app/components/ArticleEditor'), {
  ssr: false,
});

/* -------------------------- helper type guards -------------------------- */

type WithVideoUrl = { videoUrl?: string };
type WithContent = { content?: unknown; contentHtml?: unknown };
type WithCategories = { categoryId?: unknown; categoryIds?: unknown };
type WithMedia = { coverUrl?: unknown; heroImageUrl?: unknown; thumbnailUrl?: unknown };
type WithMeta = { meta?: unknown; excerpt?: unknown; scheduledFor?: unknown };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

const hasContent = (x: unknown): x is WithContent =>
  isObject(x) && ('content' in x || 'contentHtml' in x);

const hasCategories = (x: unknown): x is WithCategories =>
  isObject(x) && ('categoryId' in x || 'categoryIds' in x);

const hasMedia = (x: unknown): x is WithMedia =>
  isObject(x) && ('coverUrl' in x || 'heroImageUrl' in x || 'thumbnailUrl' in x);

const hasMeta = (x: unknown): x is WithMeta =>
  isObject(x) && ('meta' in x || 'excerpt' in x || 'scheduledFor' in x);

/* ------------------------------- local types ---------------------------- */
/** نضيف categoryId محليًا فقط لهذه الصفحة بدون تغيير النوع المركزي */
type ArticleEditableForEditor = ArticleEditable & { categoryId?: string };

/* ------------------------------- state ---------------------------------- */

interface FetchState {
  loading: boolean;
  error: string | null;
  article: (ArticleEditableForEditor & WithVideoUrl) | null;
}

interface RouteParams extends Record<string, string> {
  slug: string;
  locale: string;
}

/* ------------------------------ helpers --------------------------------- */

function pickStringLocale(value: unknown, loc: string): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value.trim() || undefined;
  if (isObject(value)) {
    const take = (k: string) => {
      const v = (value as Record<string, unknown>)[k];
      return typeof v === 'string' && v.trim() ? v : undefined;
    };
    return (
      take(loc) ??
      take('pl') ??
      take('en') ??
      (Object.values(value).find((v) => typeof v === 'string' && (v as string).trim()) as
        | string
        | undefined)
    );
  }
  return undefined;
}

/** Always return {en, pl}, duplicating when needed. */
function toLocaleRecord(
  value: unknown,
  fallback?: string,
): Record<'en' | 'pl', string> {
  if (typeof value === 'string') {
    const v = value ?? '';
    return { en: v, pl: v };
  }
  if (isObject(value)) {
    const obj = value as Record<string, unknown>;
    const en = typeof obj.en === 'string' ? (obj.en as string) : fallback ?? '';
    const pl = typeof obj.pl === 'string' ? (obj.pl as string) : en;
    return { en, pl };
  }
  const v = fallback ?? '';
  return { en: v, pl: v };
}

/* ----------------------------- normalize -------------------------------- */

function normalize(api: ArticleFromApi, loc: Locale): ArticleEditableForEditor {
  if (!api.slug) throw new Error('Article payload missing slug');

  const titleRec = toLocaleRecord((api as unknown as { title?: unknown }).title);

  const contentHtml =
    hasContent(api) && typeof api.contentHtml === 'string'
      ? api.contentHtml
      : pickStringLocale(hasContent(api) ? api.content : undefined, loc) || '';

  const contentRecRaw = toLocaleRecord(hasContent(api) ? api.content : undefined, contentHtml);

  // ↓ بدلاً من إرجاع categories[] (غير معرّفة في ArticleEditable لديك)، نعيد categoryId واحدًا
  const categoryId =
    hasCategories(api) && typeof api.categoryId === 'string'
      ? api.categoryId
      : hasCategories(api) && Array.isArray(api.categoryIds) && api.categoryIds.length > 0
      ? (api.categoryIds[0] as string)
      : undefined;

  const heroImageUrl =
    hasMedia(api) && typeof api.coverUrl === 'string'
      ? (api.coverUrl as string)
      : hasMedia(api) && typeof api.heroImageUrl === 'string'
      ? (api.heroImageUrl as string)
      : undefined;

  const thumbnailUrl =
    hasMedia(api) && typeof api.thumbnailUrl === 'string'
      ? (api.thumbnailUrl as string)
      : undefined;

  // scheduledFor: coerce Date -> ISO string, keep string passthrough
  let scheduledFor: string | undefined;
  if (hasMeta(api)) {
    const raw = (api as { scheduledFor?: unknown }).scheduledFor;
    if (typeof raw === 'string') scheduledFor = raw;
    else if (raw instanceof Date) scheduledFor = raw.toISOString();
  }

  const description =
    pickStringLocale(hasMeta(api) ? api.excerpt : undefined, loc) ??
    pickStringLocale(
      hasMeta(api) && isObject(api.meta) ? (api.meta as Record<string, unknown>).description : undefined,
      loc,
    );

  return {
    slug: api.slug,
    title: titleRec,
    description,
    contentHtml,
    contentRaw: contentRecRaw,
    locale: loc,
    // <-- نضيف الخاصية المحلية:
    categoryId,
    heroImageUrl,
    thumbnailUrl,
    scheduledFor,
    meta: hasMeta(api) && isObject(api.meta) ? (api.meta as Record<string, unknown>) : undefined,
  };
}

/* -------------------------------- page --------------------------------- */

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
    setState((prev) => ({ ...prev, loading: true, error: null }));

    (async () => {
      try {
        const res = await fetch(
          `/api/admin/articles/${encodeURIComponent(slug)}/edit`,
          { cache: 'no-store', signal: controller.signal },
        );
        const json = (await res.json().catch(() => null)) as unknown;

        if (!res.ok || !isObject(json)) {
          const msg =
            (isObject(json) && typeof (json as Record<string, unknown>).error === 'string'
              ? ((json as Record<string, string>).error)
              : `HTTP ${res.status}`) || 'Invalid response';
          throw new Error(msg);
        }

        const base = normalize(json as ArticleFromApi, locale);

        // carry videoUrl strictly typed
        const videoUrl = typeof (json as Record<string, unknown>).videoUrl === 'string'
          ? (json as Record<string, string>).videoUrl
          : undefined;

        setState({
          loading: false,
          error: null,
          article: { ...base, videoUrl },
        });
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
      const res = await fetch(
        `/api/admin/articles/${encodeURIComponent(state.article.slug)}`,
        { method: 'DELETE' },
      );
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

  /* ---------- buttons (smaller + View color) ---------- */
  const btn = {
    icon:
      'inline-flex items-center gap-2 rounded-md p-2 text-zinc-800 dark:text-zinc-100 border border-zinc-300/80 dark:border-zinc-700/70 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition',
    view:
      'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs ' +
      'border border-blue-500/60 text-blue-600 dark:text-blue-300 ' +
      'bg-white/80 dark:bg-zinc-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 ' +
      'transition',
    danger:
      'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs ' +
      'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-sm ' +
      'hover:shadow-md active:scale-[.99] transition',
  } as const;

  if (!slug) {
    return <p className="p-6 text-red-500">{t('Invalid slug', 'Niepoprawny slug')}</p>;
  }

  if (state.loading) {
    return (
      <main className="max-w-5xl mt-12 mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-6">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
          <h1 className="text-2xl font-semibold">
            {t('Loading article…', 'Ładowanie artykułu…')}
          </h1>
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
        <button onClick={load} className={btn.icon}>
          {t('Retry', 'Spróbuj ponownie')}
        </button>
      </main>
    );
  }

  if (!state.article) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-4">{t('Edit Article', 'Edytuj artykuł')}</h1>
        <p className="text-red-500">{t('Article not found.', 'Artykuł nie znaleziony.')}</p>
      </main>
    );
  }

  const { article } = state;

  return (
    <main className="max-w-4xl mt-12 mx-auto px-4 py-10 space-y-6">
      {/* top bar */}
      <header className="sticky top-16 z-10 -mx-4 px-4 py-3 bg-white/85 dark:bg-zinc-900/85 backdrop-blur border-b border-zinc-200/70 dark:border-zinc-800/60">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(listUrl)}
              className={btn.icon}
              title={t('Back', 'Powrót')}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-lg md:text-xl font-semibold">
              {t('Edit Article', 'Edytuj artykuł')}{' '}
              <span className="text-zinc-500">— {article.slug}</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/${locale}/articles/${article.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={btn.view}
              title={t('View', 'Podgląd')}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="leading-none">{t('View', 'Podgląd')}</span>
            </a>

            <button
              onClick={() => setDlgOpen(true)}
              className={btn.danger}
              title={t('Delete', 'Usuń')}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="leading-none">{t('Delete', 'Usuń')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* editor — Save lives inside ArticleEditor */}
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
          content: {
            en: article.contentRaw?.en ?? article.contentHtml ?? '',
            pl: article.contentRaw?.pl ?? article.contentHtml ?? '',
          },
          // ↓ الآن نمرر categoryId مباشرةً
          categoryId: article.categoryId || '',
          coverUrl: article.heroImageUrl,
          videoUrl: (article as unknown as WithVideoUrl).videoUrl ?? '',
          meta: article.meta,
        }}
        onSaved={() => router.push(listUrl)}
      />

      <ConfirmDelete
        open={dlgOpen}
        setOpen={setDlgOpen}
        onConfirm={handleDelete}
        title={t('Confirm deletion', 'Potwierdź usunięcie')}
        message={`${t(
          'Are you sure you want to delete this article?',
          'Czy na pewno chcesz usunąć ten artykuł?',
        )} (${article.slug})`}
        cancelLabel={t('Cancel', 'Anuluj')}
        deleteLabel={deleting ? t('Deleting…', 'Usuwanie…') : t('Delete', 'Usuń')}
      />
    </main>
  );
}
