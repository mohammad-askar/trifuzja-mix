'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
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

/* ------------------------------- Types -------------------------------- */
type Locale = 'en' | 'pl';
type CoverPosition = { x: number; y: number };

interface Category {
  _id: string;
  name: Record<Locale, string>;
}

/* ----------------------------- Translations --------------------------- */
const T = {
  en: {
    title: 'Title', excerpt: 'Summary', slug: 'Slug', cat: 'Category', cover: 'Cover',
    save: 'Save', create: 'Create',
    imgDrag: 'Click or drag', imgDrop: 'Drop here',
    words: 'words', unsaved: 'Unsaved',
    uploadOk: 'Image uploaded', loading: 'Loading…', saving: 'Saving…',
    savedAt: (t: string) => `Saved ${t}`, slugOk: '✓ slug available', slugInUse: 'Slug in use',
    readTime: 'min read', pressToSave: 'Press Ctrl/Cmd + S to save',
  },
  pl: {
    title: 'Tytuł', excerpt: 'Opis', slug: 'Slug', cat: 'Kategoria', cover: 'Grafika',
    save: 'Zapisz', create: 'Utwórz',
    imgDrag: 'Kliknij lub przeciągnij', imgDrop: 'Upuść tutaj',
    words: 'słów', unsaved: 'Niezapisane',
    uploadOk: 'Załadowano obraz', loading: 'Ładowanie…', saving: 'Zapisywanie…',
    savedAt: (t: string) => `Zapisano o ${t}`, slugOk: '✓ slug dostępny', slugInUse: 'Slug zajęty',
    readTime: 'min czytania', pressToSave: 'Wciśnij Ctrl/Cmd + S aby zapisać',
  },
} as const;

/* ------------------------------ Form Schema --------------------------- */
const schema = z.object({
  title: z.string().trim().min(4, 'Too small: expected >3 characters').max(140),
  excerpt: z.string().trim().min(4, 'Too small: expected >3 characters').max(400),
  categoryId: z.string().trim().min(1, 'Please pick a category'),
  videoUrl: z.string().url().optional().or(z.literal('')),
});
type FormValues = z.infer<typeof schema>;

/* ------------------------------ Helpers ------------------------------- */
const makeSlug = (s: string) => slugify(s, { lower: true, strict: true });
const readingTimeFromHtml = (html: string, unit: string) => {
  const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} ${unit}`;
};
const lenGT3 = (s: string) => s.trim().length > 3;

// يقبل حقول قديمة (Record<Locale,string>) أو الجديدة (string)
const fromAny = (
  val: string | Record<Locale, string> | undefined,
  preferred: Locale,
): string => {
  if (typeof val === 'string') return val;
  return (val?.[preferred] ?? val?.pl ?? val?.en ?? '') as string;
};

/* ------------------------------ Hooks --------------------------------- */
export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delay = 1000,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return useCallback((...args: A) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { fn(...args); }, delay);
  }, [fn, delay]);
}

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

/* --------------------------- Dynamic TipTap --------------------------- */
const TipTap = dynamic(() => import('@/app/components/TipTapEditor'), {
  ssr: false,
  loading: () => <div className="h-40 rounded border animate-pulse" />,
});

/* --------------------------- Component Props -------------------------- */
interface Props {
  locale: Locale;               // واجهة الإدارة فقط
  mode: 'create' | 'edit';
  defaultData?: Partial<{
    slug: string;
    title: string | Record<Locale, string>;
    excerpt: string | Record<Locale, string>;
    content: string | Record<Locale, string>;
    categoryId: string;
    coverUrl: string;
    videoUrl: string;
    meta?: {
      coverPosition?: 'top' | 'center' | 'bottom' | CoverPosition;
      [key: string]: unknown;
    };
  }>;
  onSaved?: (slug: string) => void;
}

/* ----------------------------- Component ------------------------------ */
export default function ArticleEditor({
  locale, mode, defaultData = {}, onSaved,
}: Props) {
  const router = useRouter();
  const isEdit = mode === 'edit';
  const text = T[locale];

  const formRef = useRef<HTMLFormElement>(null);
  const [fabRight, setFabRight] = useState<number>(24); // المسافة من يمين الشاشة لضبط الزر داخل إطار المقال

  // يحسب إزاحة الزر من يمين الشاشة بحيث يبقى بمحاذاة حدود النموذج (max-w-7xl)
  const updateFabRight = useCallback(() => {
    const rect = formRef.current?.getBoundingClientRect();
    const right = Math.max(16, window.innerWidth - ((rect?.right ?? window.innerWidth)) + 16);
    setFabRight(right);
  }, []);
  useEffect(() => {
    updateFabRight();
    window.addEventListener('resize', updateFabRight);
    window.addEventListener('scroll', updateFabRight, { passive: true });
    return () => {
      window.removeEventListener('resize', updateFabRight);
      window.removeEventListener('scroll', updateFabRight);
    };
  }, [updateFabRight]);

  const {
    register, handleSubmit, watch,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: fromAny(defaultData.title, locale),
      excerpt: fromAny(defaultData.excerpt, locale),
      categoryId: defaultData.categoryId ?? '',
      videoUrl: defaultData.videoUrl ?? '',
    },
  });

  const [content, setContent] = useState<string>(fromAny(defaultData.content, locale));
  const [cover, setCover] = useState(defaultData.coverUrl ?? '');

  // نقطة التركيز للصورة
  const [coverPosition, setCoverPosition] = useState<CoverPosition>(() => {
    const pos = defaultData.meta?.coverPosition;
    if (typeof pos === 'string') {
      if (pos === 'top') return { x: 50, y: 0 };
      if (pos === 'bottom') return { x: 50, y: 100 };
    }
    if (typeof pos === 'object' && pos !== null && 'x' in pos && 'y' in pos) {
      return pos as CoverPosition;
    }
    return { x: 50, y: 50 };
  });

  const [cats, setCats] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(isEdit ? true : null);
  const [dirty, setDirty] = useState(false);

  const coverContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const titleVal = watch('title');
  const excerptVal = watch('excerpt');
  const categoryId = watch('categoryId');

  const autoSlug = useMemo(() => makeSlug(titleVal), [titleVal]);
  const visibleSlug = isEdit ? (defaultData.slug as string) : autoSlug;

  // تحميل التصنيفات
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingCats(true);
      try {
        const r = await fetch(`/api/categories`);
        const data: Category[] = await r.json();
        if (mounted) setCats(data);
      } catch {
        toast.error('Failed to load categories');
      } finally {
        if (mounted) setLoadingCats(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useUpload(locale, setCover);

  const words = useMemo(
    () => content.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length,
    [content],
  );
  const reading = readingTimeFromHtml(content, text.readTime);

  const basicsReady = lenGT3(titleVal) && lenGT3(excerptVal) && lenGT3(categoryId);
  const ready = basicsReady;
  const canSubmit = basicsReady && !isSubmitting && (isEdit || slugAvailable !== false);

  const checkSlugAvailability = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) return setSlugAvailable(null);
    if (isEdit && defaultData.slug === slug) { setSlugAvailable(true); return; }
    try {
      const r = await fetch(`/api/admin/articles/slug?slug=${encodeURIComponent(slug)}`);
      if (r.ok) {
        const out = (await r.json()) as { exists?: boolean };
        setSlugAvailable(out.exists === false);
        return;
      }
    } catch { /* noop */ }
  }, [isEdit, defaultData?.slug]);

  const debouncedCheckSlug = useDebouncedCallback(checkSlugAvailability, 450);

  useEffect(() => { debouncedCheckSlug(visibleSlug); }, [visibleSlug, debouncedCheckSlug]);
  useEffect(() => { setDirty(true); }, [titleVal, excerptVal, content, categoryId, cover, coverPosition]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // سحب/تحريك نقطة التركيز للصورة
  const handleFocalPointMove = useCallback((clientX: number, clientY: number) => {
    if (!coverContainerRef.current) return;
    const rect = coverContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    setCoverPosition({ x, y });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDraggingRef.current) handleFocalPointMove(e.clientX, e.clientY);
  }, [handleFocalPointMove]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isDraggingRef.current && e.touches[0]) {
      handleFocalPointMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handleFocalPointMove]);

  // Autosave (يحفظ كحقول بسيطة بدون لغات)
  const autosave = useCallback(async () => {
    if (!ready || (!isEdit && slugAvailable === false)) return;

    const payload = {
      title: titleVal,
      excerpt: excerptVal,
      content,                 // string
      categoryId,
      coverUrl: cover || undefined,
      videoUrl: (watch('videoUrl') || '').trim() || undefined,
      readingTime: reading,
      meta: { ...(defaultData.meta || {}), coverPosition },
    };

    try {
      setSaving(true);
      const r = await fetch(`/api/admin/articles/${encodeURIComponent(visibleSlug)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (r.ok) { setDirty(false); setLastSavedAt(new Date()); }
    } finally { setSaving(false); }
  }, [
    ready, isEdit, slugAvailable, defaultData, titleVal, excerptVal, content,
    categoryId, cover, reading, visibleSlug, watch, coverPosition,
  ]);

  const debouncedAutosave = useDebouncedCallback(autosave, 1200);
  useEffect(() => { debouncedAutosave(); }, [
    titleVal, excerptVal, content, categoryId, cover, coverPosition, debouncedAutosave,
  ]);

  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
    const saveCombo =
      (isMac && e.metaKey && e.key.toLowerCase() === 's') ||
      (!isMac && e.ctrlKey && e.key.toLowerCase() === 's');
    if (saveCombo) { e.preventDefault(); handleSubmit(onSubmit)(); }
  };

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleMouseUp);
  }, [handleMouseMove, handleTouchMove]);

  const handleMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      e.preventDefault();
      isDraggingRef.current = true;
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    },
    [handleMouseMove, handleMouseUp, handleTouchMove],
  );

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove]);

  // Submit (يحفظ حقول بسيطة)
  const onSubmit = async (fv: FormValues) => {
    if (!isEdit && slugAvailable === false) { toast.error(text.slugInUse); return; }
    const slugForSubmit = visibleSlug;

    const payload = {
      title: fv.title,
      excerpt: fv.excerpt,
      content,                     // string
      categoryId: fv.categoryId,
      coverUrl: cover || undefined,
      videoUrl: fv.videoUrl?.trim() || undefined,
      readingTime: reading,
      meta: { ...(defaultData.meta || {}), coverPosition },
    };

    const res = await fetch(`/api/admin/articles/${encodeURIComponent(slugForSubmit)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error((out as { error?: string }).error || 'error');
    toast.success(isEdit ? text.save : text.create);
    if (!isEdit) {
      onSaved?.(slugForSubmit);
      router.push(`/${locale}/admin/articles/${slugForSubmit}/edit`);
    } else {
      setDirty(false); setLastSavedAt(new Date()); router.refresh();
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit(onSubmit)}
      onKeyDown={onKeyDown}
      aria-describedby="save-hint"
      className="space-y-4 max-w-7xl mx-auto p-4 bg-white/80 dark:bg-zinc-900/80 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm pb-24"
    >
      {/* Title & slug */}
      <div className="space-y-2">
        <input
          {...register('title')}
          placeholder={text.title}
          className="w-full rounded-lg border px-3 py-2 text-lg font-medium bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
        <div className="flex flex-wrap items-center gap-2 justify-between text-xs text-gray-500 dark:text-gray-400">
          {errors.title ? <span className="text-red-600">{errors.title.message}</span> : <span>{text.pressToSave}</span>}
          <span>{(watch('title') || '').length}/140</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 select-all">
          <span className="rounded bg-gray-100 dark:bg-zinc-800 px-2 py-0.5">/{visibleSlug}</span>
          {slugAvailable === true && <span className="text-green-600">{text.slugOk}</span>}
          {slugAvailable === false && <span className="text-red-600">{text.slugInUse}</span>}
        </div>
      </div>

      {/* Excerpt */}
      <div className="space-y-1">
        <textarea
          {...register('excerpt')}
          rows={3}
          placeholder={text.excerpt}
          className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          {errors.excerpt && <span className="text-red-600">{errors.excerpt.message}</span>}
          <span>{(watch('excerpt') || '').length}/400</span>
        </div>
      </div>

      {/* Category ONLY */}
      <div>
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{text.cat}</label>
        {loadingCats ? (
          <div className="h-[38px] rounded-lg bg-gray-100 dark:bg-zinc-800 animate-pulse" />
        ) : (
          <select
            {...register('categoryId')}
            className={`w-full rounded-lg border px-3 py-2 bg-white dark:bg-zinc-900 ${
              errors.categoryId ? 'border-red-600' : 'border-gray-300 dark:border-zinc-700'
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
      </div>

      {/* TipTap Editor */}
      <div className="space-y-1 rounded-lg border border-gray-200 dark:border-zinc-700 p-3">
        <TipTap content={content} setContent={setContent} />
        <div className="flex justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>
            {words} {text.words} • {reading}
          </span>
        </div>
      </div>

      {/* Video URL */}
      <div>
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

      {/* Cover Upload & Preview */}
      <div>
        <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
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
          <div
            ref={coverContainerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
            className="relative h-44 mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-800 cursor-grab active:cursor-grabbing"
            title="Click and drag to set the focal point"
          >
            <Image
              src={cover.startsWith('http') ? cover : cover.startsWith('/') ? cover : `/${cover}`}
              alt="cover"
              fill
              className="object-cover pointer-events-none"
              style={{ objectPosition: `${coverPosition.x}% ${coverPosition.y}%` }}
              priority
            />
            <button
              type="button"
              onClick={() => setCover('')}
              className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-lg leading-none z-10"
              aria-label="Remove cover"
              title="Remove cover"
            >
              ×
            </button>
            <div
              className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 border-2 border-white bg-white/30 rounded-full pointer-events-none z-10"
              style={{ left: `${coverPosition.x}%`, top: `${coverPosition.y}%` }}
            />
          </div>
        )}
      </div>

      {/* شريط الحالة */}
      <div className="border-t pt-3 mt-2 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-3">
          {saving && <span>{text.saving}</span>}
          {!saving && !dirty && lastSavedAt && <span>{text.savedAt(lastSavedAt.toLocaleTimeString())}</span>}
          {(Object.keys(dirtyFields).length > 0 || dirty) && <span className="text-orange-600">{text.unsaved}</span>}
        </div>
      </div>

      {/* زر حفظ عائم داخل حدود المقال (محاذاة ديناميكية) */}
      <button
        type="submit"
        disabled={!canSubmit || isSubmitting}
        className="fixed bottom-6 z-[1000] rounded-full shadow-lg px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold"
        style={{ right: fabRight }}
        aria-label="Save"
        title={isSubmitting ? text.saving : (isEdit ? text.save : text.create)}
      >
        {isSubmitting ? text.saving : (isEdit ? text.save : text.create)}
      </button>
    </form>
  );
}
