// E:\trifuzja-mix\app\components\ArticleEditor.tsx
'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  KeyboardEvent,
} from 'react';
import { useForm } from 'react-hook-form';
import slugify from 'slugify';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';

/* ------------------------------------------------------------------ */
/*                              Types                                  */
/* ------------------------------------------------------------------ */

type Locale = 'en' | 'pl';
type PageKey = 'multi' | 'terra' | 'daily';
type ArticleStatus = 'draft' | 'published';

interface Category {
  _id: string;
  name: Record<Locale, string>;
  page: PageKey;
}

/* ------------------------------------------------------------------ */
/*                          Translations                               */
/* ------------------------------------------------------------------ */

const T = {
  en: {
    title: 'Title',
    excerpt: 'Summary',
    slug: 'Slug',
    cat: 'Category',
    cover: 'Cover',
    draft: 'Draft',
    published: 'Published',
    publish: 'Publish',
    unpublish: 'Unpublish',
    save: 'Save',
    create: 'Create',
    imgDrag: 'Click or drag',
    imgDrop: 'Drop here',
    words: 'words',
    addMore: 'Add ≥20 words',
    unsaved: 'Unsaved',
    uploadOk: 'Image uploaded',
    loading: 'Loading…',
    saving: 'Saving…',
    savedAt: (t: string) => `Saved ${t}`,
    slugOk: '✓ slug available',
    slugInUse: 'Slug in use',
    readTime: 'min read',
    pressToSave: 'Press Ctrl/Cmd + S to save',
  },
  pl: {
    title: 'Tytuł',
    excerpt: 'Opis',
    slug: 'Slug',
    cat: 'Kategoria',
    cover: 'Grafika',
    draft: 'Szkic',
    published: 'Opublikowany',
    publish: 'Opublikuj',
    unpublish: 'Cofnij',
    save: 'Zapisz',
    create: 'Utwórz',
    imgDrag: 'Kliknij lub przeciągnij',
    imgDrop: 'Upuść',
    words: 'słów',
    addMore: 'Dodaj ≥20 słów',
    unsaved: 'Niezapisane',
    uploadOk: 'Załadowano',
    loading: 'Ładowanie…',
    saving: 'Zapisywanie…',
    savedAt: (t: string) => `Zapisano o ${t}`,
    slugOk: '✓ slug dostępny',
    slugInUse: 'Slug zajęty',
    readTime: 'min czytania',
    pressToSave: 'Wciśnij Ctrl/Cmd + S aby zapisać',
  },
} as const;

/* ------------------------------------------------------------------ */
/*                          Form schema                               */
/* ------------------------------------------------------------------ */

const schema = z.object({
  title: z.string().trim().min(4, 'Too small: expected >3 characters').max(140),
  excerpt: z.string().trim().min(4, 'Too small: expected >3 characters').max(400),
  page: z.enum(['multi', 'terra', 'daily']),
  categoryId: z.string().trim().min(4, 'Please pick a category'),
  videoUrl: z.string().url().optional().or(z.literal('')),
  status: z.enum(['draft', 'published']),
});
type FormValues = z.infer<typeof schema>;

/* ------------------------------------------------------------------ */
/*                      Helper functions                              */
/* ------------------------------------------------------------------ */

const makeSlug = (s: string) => slugify(s, { lower: true, strict: true });

const readingTimeFromHtml = (html: string, unit: string) => {
  const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} ${unit}`;
};

const lenGT3 = (s: string) => s.trim().length > 3;
const htmlTextLenGT3 = (html: string) => html.replace(/<[^>]+>/g, ' ').trim().length > 3;

/* ------------------------------------------------------------------ */
/*                           Debounce hook                             */
/* ------------------------------------------------------------------ */

export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delay = 1000
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // نظّف المؤقّت عند إزالة المكوّن
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return useCallback(
    (...args: A) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        fn(...args);
      }, delay);
    },
    [fn, delay]
  );
}

/* ------------------------------------------------------------------ */
/*                 Image upload encapsulated hook                     */
/* ------------------------------------------------------------------ */

function useUpload(locale: Locale, onUrl: (url: string) => void) {
  return useDropzone({
    onDrop: async (files: File[]) => {
      if (!files[0]) return;
      const fd = new FormData();
      fd.append('file', files[0]);
      try {
        const r = await fetch('/api/upload', { method: 'POST', body: fd });
        const { url, error } = (await r.json()) as { url?: string; error?: string };
        if (!r.ok || !url) throw new Error(error || 'upload');
        onUrl(url);
        toast.success(T[locale].uploadOk);
      } catch (err) {
        toast.error((err as Error).message);
      }
    },
  });
}

/* ------------------------------------------------------------------ */
/*                       Dynamic TipTap                               */
/* ------------------------------------------------------------------ */

const TipTap = dynamic(() => import('@/app/components/TipTapEditor'), {
  ssr: false,
  loading: () => <div className="h-40 rounded border animate-pulse" />,
});

/* ------------------------------------------------------------------ */
/*                         Component                                  */
/* ------------------------------------------------------------------ */

interface Props {
  locale: Locale;
  mode: 'create' | 'edit';
  defaultData?: Partial<{
    slug: string;
    title: Record<Locale, string>;
    excerpt: Record<Locale, string>;
    content: Record<Locale, string>;
    page: PageKey;
    categoryId: string;
    coverUrl: string;
    videoUrl: string;
    status: ArticleStatus;
  }>;
  onSaved?: (slug: string) => void;
}

export default function ArticleEditor({
  locale,
  mode,
  defaultData = {},
  onSaved,
}: Props) {
  const router = useRouter();
  const isEdit = mode === 'edit';
  const text = T[locale];

  /* ------------------ React-Hook-Form ------------------ */
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: defaultData.title?.[locale] ?? '',
      excerpt: defaultData.excerpt?.[locale] ?? '',
      page: defaultData.page ?? 'multi',
      categoryId: defaultData.categoryId ?? '',
      videoUrl: defaultData.videoUrl ?? '',
      status: defaultData.status ?? 'draft',
    },
  });

  /* ------------------ Local state ------------------ */
  const [content, setContent] = useState<string>(defaultData.content?.[locale] ?? '');
  const [cover, setCover] = useState(defaultData.coverUrl ?? '');
  const [cats, setCats] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);

  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(isEdit ? true : null);
  const [dirty, setDirty] = useState(false);

  /* ----------------- Watch values ------------------ */
  const titleVal = watch('title');
  const pageVal = watch('page');
  const statusVal = watch('status');
  const excerptVal = watch('excerpt');
  const categoryId = watch('categoryId');

  /* ----------- auto-slug (read-only display) -------- */
  const autoSlug = useMemo(() => makeSlug(titleVal), [titleVal]);
  const visibleSlug = isEdit ? (defaultData.slug as string) : autoSlug;

  /* ----------- fetch categories on page change ------ */
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingCats(true);
      try {
        const r = await fetch(`/api/categories?page=${pageVal}`);
        const data: Category[] = await r.json();
        if (mounted) setCats(data);
      } catch {
        toast.error('Failed to load categories');
      } finally {
        if (mounted) setLoadingCats(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [pageVal]);

  /* -------------- image upload hook ----------------- */
  const { getRootProps, getInputProps, isDragActive } = useUpload(locale, setCover);

  /* --------------- word count & ready --------------- */
  const words = useMemo(
    () =>
      content
        .replace(/<[^>]+>/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean).length,
    [content],
  );

  const reading = readingTimeFromHtml(content, text.readTime);

  const ready =
    lenGT3(titleVal) && lenGT3(excerptVal) && htmlTextLenGT3(content) && lenGT3(categoryId);

  const canSubmit =
    ready &&
    !isSubmitting &&
    // في وضع الإنشاء نحتاج slug متاح، في وضع التعديل نفس الـ slug دائمًا مقبول
    (isEdit || slugAvailable !== false);

  /* ----------------- Slug availability check ----------------- */
  const checkSlugAvailability = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) return setSlugAvailable(null);

    // في وضع التعديل، إذا لم يتغيّر الـ slug، فهو متاح
    if (isEdit && defaultData.slug === slug) {
      setSlugAvailable(true);
      return;
    }

    // 1) استخدم راوت الفحص إن كان موجودًا
    try {
      const r = await fetch(`/api/admin/articles/slug?slug=${encodeURIComponent(slug)}`);
      if (r.ok) {
        const out = await r.json();
        setSlugAvailable(!out.exists);
        return;
      }
      // لو 404 Not Found لهذا الراوت، كمل للخطة B
    } catch {
      /* noop */
    }

    // 2) بديل: حاول تجيب المقال نفسه — 200 => موجود (غير متاح) / 404 => غير موجود (متاح)
    try {
      const r = await fetch(`/api/admin/articles/${encodeURIComponent(slug)}`);
      if (r.status === 404) setSlugAvailable(true);
      else if (r.ok) setSlugAvailable(false);
      else setSlugAvailable(null);
    } catch {
      setSlugAvailable(null);
    }
  }, [isEdit, defaultData?.slug]);

  const debouncedCheckSlug = useDebouncedCallback(checkSlugAvailability, 450);

  useEffect(() => {
    debouncedCheckSlug(visibleSlug);
  }, [visibleSlug, debouncedCheckSlug]);

  /* ----------------- Autosave (draft upsert) ----------------- */
  // اعتبر أي تغيير على الحقول تغييرات غير محفوظة
  useEffect(() => {
    setDirty(true);
  }, [titleVal, excerptVal, content, categoryId, cover, statusVal, pageVal]);

  // تحذير فقدان التعديلات عند إغلاق الصفحة
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const autosave = useCallback(async () => {
    if (!ready) return;
    if (!isEdit && slugAvailable === false) return; // لا تحفظ إنشائيًا على slug مستخدم
    if (statusVal !== 'draft') return; // لا ننشر تلقائيًا

    const payload = {
      // لا نرسل slug في الـ body — المسار هو المصدر
      title: { ...(defaultData.title || {}), [locale]: titleVal },
      excerpt: { ...(defaultData.excerpt || {}), [locale]: excerptVal },
      content: { ...(defaultData.content || {}), [locale]: content },
      page: pageVal,
      categoryId,
      coverUrl: cover || undefined,
      videoUrl: (watch('videoUrl') || '').trim() || undefined,
      status: 'draft' as const,
      readingTime: reading,
    };

    try {
      setSaving(true);
      const r = await fetch(`/api/admin/articles/${encodeURIComponent(visibleSlug)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        setDirty(false);
        setLastSavedAt(new Date());
      }
    } finally {
      setSaving(false);
    }
  }, [
    ready,
    isEdit,
    slugAvailable,
    statusVal,
    defaultData.title,
    defaultData.excerpt,
    defaultData.content,
    locale,
    titleVal,
    excerptVal,
    content,
    pageVal,
    categoryId,
    cover,
    reading,
    visibleSlug,
    watch,
  ]);

  const debouncedAutosave = useDebouncedCallback(autosave, 1200);

  useEffect(() => {
    debouncedAutosave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleVal, excerptVal, content, categoryId, cover, statusVal, pageVal]);

  /* ----------------- Keyboard shortcut: Ctrl/Cmd+S ----------------- */
  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const saveCombo = (isMac && e.metaKey && e.key.toLowerCase() === 's') || (!isMac && e.ctrlKey && e.key.toLowerCase() === 's');
    if (saveCombo) {
      e.preventDefault();
      handleSubmit(onSubmit)();
    }
  };

  /* ----------------- submit handler ----------------- */
  const onSubmit = async (fv: FormValues) => {
    // في وضع الإنشاء، إذا الـ slug مستخدم — امنع الإرسال
    if (!isEdit && slugAvailable === false) {
      toast.error(text.slugInUse);
      return;
    }

    const slugForSubmit = visibleSlug;
    const payload = {
      title: { ...(defaultData.title || {}), [locale]: fv.title },
      excerpt: { ...(defaultData.excerpt || {}), [locale]: fv.excerpt },
      content: { ...(defaultData.content || {}), [locale]: content },
      page: fv.page,
      categoryId: fv.categoryId,
      coverUrl: cover || undefined,
      videoUrl: fv.videoUrl?.trim() || undefined,
      status: fv.status,
      readingTime: reading,
    };

    const res = await fetch(`/api/admin/articles/${encodeURIComponent(slugForSubmit)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(out.error || 'error');

    toast.success(isEdit ? text.save : text.create);

    if (!isEdit) {
      onSaved?.(slugForSubmit);
      router.push(`/${locale}/admin/articles/${slugForSubmit}/edit`);
    } else {
      setDirty(false);
      setLastSavedAt(new Date());
      router.refresh();
    }
  };

  /* -------------------- JSX -------------------- */
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onKeyDown={onKeyDown}
      aria-describedby="save-hint"
      className="space-y-4 max-w-3xl mx-auto p-4 bg-white/80 dark:bg-zinc-900/80 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm"
    >
      {/* --- Title & slug --- */}
      <div className="space-y-2">
        <label className="sr-only" htmlFor="title-input">{text.title}</label>
        <input
          id="title-input"
          {...register('title')}
          placeholder={text.title}
          className="w-full rounded-lg border px-3 py-2 text-lg font-medium bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
        <div className="flex flex-wrap items-center gap-2 justify-between text-xs text-gray-500 dark:text-gray-400">
          {errors.title ? (
            <span className="text-red-600">{errors.title.message}</span>
          ) : (
            <span id="save-hint">{text.pressToSave}</span>
          )}
          <span>{titleVal.length}/140</span>
        </div>
        {/* slug readonly + availability badge */}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 select-all">
          <span className="rounded bg-gray-100 dark:bg-zinc-800 px-2 py-0.5">/{visibleSlug}</span>
          {slugAvailable === true && <span className="text-green-600">{text.slugOk}</span>}
          {slugAvailable === false && <span className="text-red-600">{text.slugInUse}</span>}
        </div>
      </div>

      {/* --- Excerpt --- */}
      <div className="space-y-1">
        <label className="sr-only" htmlFor="excerpt-input">{text.excerpt}</label>
        <textarea
          id="excerpt-input"
          {...register('excerpt')}
          rows={3}
          placeholder={text.excerpt}
          className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          {errors.excerpt && <span className="text-red-600">{errors.excerpt.message}</span>}
          <span>{excerptVal.length}/400</span>
        </div>
      </div>

      {/* --- Selects --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* page */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Page</label>
          <select
            {...register('page')}
            className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            {(['multi', 'terra', 'daily'] as PageKey[]).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* category */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{text.cat}</label>
          {loadingCats ? (
            <div className="h-[38px] rounded-lg bg-gray-100 dark:bg-zinc-800 animate-pulse" aria-busy="true" />
          ) : (
            <select
              {...register('categoryId')}
              className={`w-full rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900 ${
                errors.categoryId ? 'border-red-600' : 'border-gray-300 dark:border-zinc-700'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/40`}
            >
              <option value="">{text.cat}</option>
              {cats.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name[locale]}
                </option>
              ))}
            </select>
          )}
          {errors.categoryId && (
            <span className="text-xs text-red-600">{errors.categoryId.message as string}</span>
          )}
        </div>

        {/* status */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Status</label>
          <select
            {...register('status')}
            className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <option value="draft">{text.draft}</option>
            <option value="published">{text.published}</option>
          </select>
        </div>
      </div>

      {/* --- Editor --- */}
      <div className="space-y-1">
        <TipTap
          content={content}
          setContent={setContent}
          /* باقي الإضافات مفعلة داخل TipTapEditor */
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>
            {words} {text.words} • {reading}
          </span>
          {words < 2 && <span className="text-orange-600 font-semibold">{text.addMore}</span>}
        </div>
      </div>

      {/* --- Video URL --- */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300" htmlFor="video-url">
          Video URL
        </label>
        <input
          id="video-url"
          {...register('videoUrl')}
          placeholder="https://…"
          className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
      </div>

      {/* --- Cover upload --- */}
      <div>
        <label className="block mb-1 font-semibold text-gray-700 dark:text-gray-300">
          {text.cover}
        </label>
        <div
          {...getRootProps()}
          className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition hover:border-blue-500 dark:border-zinc-700"
        >
          <input {...getInputProps()} />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isDragActive ? text.imgDrop : text.imgDrag}
          </p>
        </div>
        {cover && (
          <div className="relative h-44 mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-800">
            <Image
              src={
                cover.startsWith('http')
                  ? cover
                  : cover.startsWith('/')
                  ? cover
                  : `/${cover}`
              }
              alt="cover"
              fill
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => setCover('')}
              className="absolute top-2 right-2 bg-red-600 text-white rounded-full px-2 leading-none"
              aria-label="Remove cover"
              title="Remove cover"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* --- Action bar --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-t pt-3 mt-2 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                statusVal === 'published' ? 'bg-green-500' : 'bg-yellow-500'
              }`}
              aria-hidden
            />
            {statusVal === 'published' ? text.published : text.draft}
          </span>

          {saving && <span>{text.saving}</span>}
          {!saving && !dirty && lastSavedAt && (
            <span>{text.savedAt(lastSavedAt.toLocaleTimeString())}</span>
          )}
          {(Object.keys(dirtyFields).length > 0 || dirty) && (
            <span className="text-orange-600">{text.unsaved}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm transition"
          >
            {isSubmitting ? '…' : isEdit ? text.save : text.create}
          </button>
        </div>
      </div>
    </form>
  );
}
