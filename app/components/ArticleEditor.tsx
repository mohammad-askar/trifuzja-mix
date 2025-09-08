'use client';

import {
  useState,
  useEffect,
  useMemo,
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
const readingTime = (html: string) =>
  `${Math.max(
    1,
    Math.ceil(
      html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length /
        200,
    ),
  )} min`;

// helpers for "length > 3" rule
const lenGT3 = (s: string) => s.trim().length > 3;
const htmlTextLenGT3 = (html: string) =>
  html.replace(/<[^>]+>/g, ' ').trim().length > 3;

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
  const [content, setContent] = useState(
    defaultData.content?.[locale] ?? '',
  );
  const [cover, setCover] = useState(defaultData.coverUrl ?? '');
  const [cats, setCats] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);

  /* ----------------- Watch values ------------------ */
  const titleVal = watch('title');
  const pageVal = watch('page');
  const statusVal = watch('status');
  const excerptVal = watch('excerpt');
  const categoryId = watch('categoryId');

  /* ----------- auto-slug (read-only display) -------- */
  const autoSlug = useMemo(() => makeSlug(titleVal), [titleVal]);

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
  const {
    getRootProps,
    getInputProps,
    isDragActive,
  } = useUpload(locale, setCover);

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

  // NEW: enable button only when all main fields have >3 characters
  const ready =
    lenGT3(titleVal) &&
    lenGT3(excerptVal) &&
    htmlTextLenGT3(content) &&
    lenGT3(categoryId);

  /* ----------------- submit handler ----------------- */
  const onSubmit = async (fv: FormValues) => {
    const payload = {
      slug: autoSlug,
      title: { ...(defaultData.title || {}), [locale]: fv.title },
      excerpt: { ...(defaultData.excerpt || {}), [locale]: fv.excerpt },
      content: { ...(defaultData.content || {}), [locale]: content },
      page: fv.page,
      categoryId: fv.categoryId,
      coverUrl: cover || undefined,
      videoUrl: fv.videoUrl || undefined,
      status: fv.status,
      readingTime: readingTime(content),
    };

    const endpoint = isEdit
      ? `/api/admin/articles/${defaultData.slug}`
      : '/api/articles';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const out = await res.json();
    if (!res.ok) return toast.error(out.error || 'error');

    toast.success(isEdit ? text.save : text.create);
    if (!isEdit) {
      onSaved?.(autoSlug);
      router.push(`/${locale}/admin/articles/${autoSlug}/edit`);
    } else {
      router.refresh();
    }
  };

  /* -------------------- JSX -------------------- */
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 max-w-3xl mx-auto p-4 bg-white dark:bg-zinc-900 rounded-lg shadow"
    >
      {/* --- Title & slug --- */}
      <div className="space-y-2">
        <input
          {...register('title')}
          placeholder={text.title}
          className="w-full rounded border px-3 py-2 text-lg font-medium bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          {errors.title && (
            <span className="text-red-600">{errors.title.message}</span>
          )}
          {/* fixed counter */}
          <span>{titleVal.length}/140</span>
        </div>
        {/* slug readonly */}
        <div className="text-xs text-gray-500 dark:text-gray-400 select-all">
          /{autoSlug}
        </div>
      </div>

      {/* --- Excerpt --- */}
      <div className="space-y-1">
        <textarea
          {...register('excerpt')}
          rows={3}
          placeholder={text.excerpt}
          className="w-full rounded border px-3 py-2 bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 resize-none"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          {errors.excerpt && (
            <span className="text-red-600">{errors.excerpt.message}</span>
          )}
          {/* fixed counter */}
          <span>{excerptVal.length}/400</span>
        </div>
      </div>

      {/* --- Selects --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* page */}
        <select
          {...register('page')}
          className="rounded border px-3 py-2 bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700"
        >
          {(['multi', 'terra', 'daily'] as PageKey[]).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {/* category */}
        {loadingCats ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {text.loading}
          </div>
        ) : (
          <select
            {...register('categoryId')}
            className={`rounded border px-3 py-2 bg-white dark:bg-zinc-900 ${
              errors.categoryId
                ? 'border-red-600'
                : 'border-gray-300 dark:border-zinc-700'
            }`}
          >
            <option value="">{text.cat}</option>
            {cats.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name[locale]}
              </option>
            ))}
          </select>
        )}

        {/* status */}
        <select
          {...register('status')}
          className="rounded border px-3 py-2 bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700"
        >
          <option value="draft">{text.draft}</option>
          <option value="published">{text.published}</option>
        </select>
      </div>

      {/* --- Editor --- */}
      <TipTap
        content={content}
        setContent={setContent}
        /* باقي الإضافات مفعلة داخل TipTapEditor */
      />
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>
          {words} {text.words}
        </span>
        {/* يمكنك إبقاء هذا التحذير أو إزالته لأنه لا يتوافق مع شرط >3 */}
        {words < 2 && (
          <span className="text-orange-600 font-semibold">
            {text.addMore}
          </span>
        )}
      </div>

      {/* --- Cover upload --- */}
      <div>
        <label className="block mb-1 font-semibold text-gray-700 dark:text-gray-300">
          {text.cover}
        </label>
        <div
          {...getRootProps()}
          className="border-2 border-dashed rounded p-4 text-center cursor-pointer transition hover:border-blue-500 dark:border-zinc-700"
        >
          <input {...getInputProps()} />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isDragActive ? text.imgDrop : text.imgDrag}
          </p>
        </div>
        {cover && (
          <div className="relative h-40 mt-3 rounded overflow-hidden">
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
              className="absolute top-1 right-1 bg-red-600 text-white rounded-full px-2"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* --- Action bar --- */}
      <div className="flex justify-between items-center border-t pt-3 mt-2 text-xs text-gray-600 dark:text-gray-400">
        <div className="space-x-3">
          <span>
            {statusVal === 'published' ? text.published : text.draft}
          </span>
          {Object.keys(dirtyFields).length > 0 && (
            <span className="text-orange-600">{text.unsaved}</span>
          )}
        </div>
        <button
          type="submit"
          disabled={!ready || isSubmitting}
          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm"
        >
          {isSubmitting ? '…' : isEdit ? text.save : text.create}
        </button>
      </div>
    </form>
  );
}
