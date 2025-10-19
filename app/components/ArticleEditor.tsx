//E:\trifuzja-mix\app\components\ArticleEditor.tsx
'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  KeyboardEvent,
} from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

import SaveFab from '@/app/components/editor/SaveFab';
import TitleSlug from '@/app/components/editor/TitleSlug';
import Excerpt from '@/app/components/editor/Excerpt';
import CategorySelect from '@/app/components/editor/CategorySelect';
import VideoSection from '@/app/components/editor/VideoSection';
import EditorBox from '@/app/components/editor/EditorBox';
import CoverUploader from '@/app/components/editor/CoverUploader';
import StatusBar from '@/app/components/editor/StatusBar';

import type { Locale, CoverPosition } from '@/app/components/editor/article.types';
import { T } from '@/app/components/editor/i18n';
import {
  ArticleFormSchema as schema,
  type ArticleFormValues as FormValues,
} from '@/app/components/editor/article.schema';
import { makeSlug, readingTimeFromHtml, lenGT3, fromAny } from '@/app/components/editor/helpers';
import { useDebouncedCallback } from '@/app/components/editor/hooks';

/* ----------------------- API response types ----------------------- */
type SlugCheckResponse = { exists?: boolean };
type UpdateResponse = {
  error?: string;
  message?: string;
  slugChanged?: boolean;
  newSlug?: string;
  article?: unknown;
};

/* ------------------------- Local draft ------------------------- */
type DraftBlob = {
  ver: 1;
  savedAt: number;
  data: {
    title: string;
    excerpt: string;
    content: string;
    categoryId: string;
    cover: string;
    coverPosition: CoverPosition;
    videoUrl: string;
    isVideoOnly: boolean;
  };
};

function makeDraftKey(locale: Locale, mode: 'create' | 'edit', slug?: string): string {
  return mode === 'edit'
    ? `ia:draft:${locale}:edit:${slug ?? 'unknown'}`
    : `ia:draft:${locale}:create`;
}

function readDraft(key: string): DraftBlob | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftBlob;
    if (parsed && parsed.ver === 1 && typeof parsed.savedAt === 'number') return parsed;
    return null;
  } catch {
    return null;
  }
}

function writeDraft(key: string, blob: DraftBlob): void {
  try {
    localStorage.setItem(key, JSON.stringify(blob));
  } catch {}
}

function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {}
}

interface Props {
  locale: Locale;
  mode: 'create' | 'edit';
  defaultData?: Partial<{
    slug: string;
    title: string | Record<Locale, string>;
    excerpt: string | Record<Locale, string>;
    content: string | Record<Locale, string>;
    categoryId: string;
    coverUrl: string;
    videoUrl: string;
    meta?: { coverPosition?: 'top' | 'center' | 'bottom' | CoverPosition; [k: string]: unknown };
  }>;
  onSaved?: (slug: string) => void;
}

export default function ArticleEditor({ locale, mode, defaultData = {}, onSaved }: Props) {
  const router = useRouter();
  const isEdit = mode === 'edit';
  const text = T[locale];

  const initialDefaults: FormValues =
    isEdit
      ? {
          title: fromAny(defaultData.title, locale) ?? '',
          excerpt: fromAny(defaultData.excerpt, locale) ?? '',
          categoryId: defaultData.categoryId ?? '',
          videoUrl: defaultData.videoUrl ?? '',
        }
      : {
          title: '',
          excerpt: '',
          categoryId: '',
          videoUrl: '',
        };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialDefaults,
  });

  const [content, setContent] = useState<string>(
    isEdit ? fromAny(defaultData.content, locale) ?? '' : '',
  );
  const [cover, setCover] = useState<string>(isEdit ? defaultData.coverUrl ?? '' : '');

  const [coverPosition, setCoverPosition] = useState<CoverPosition>(() => {
    if (!isEdit) return { x: 50, y: 50 };
    const pos = defaultData.meta?.coverPosition;
    if (pos === 'top') return { x: 50, y: 0 };
    if (pos === 'bottom') return { x: 50, y: 100 };
    if (typeof pos === 'object' && pos && 'x' in pos && 'y' in pos) return pos as CoverPosition;
    return { x: 50, y: 50 };
  });

  const initialVideoOnly = isEdit ? Boolean(defaultData.videoUrl) : false;
  const [isVideoOnly, setIsVideoOnly] = useState<boolean>(initialVideoOnly);

  const [saving, setSaving] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(isEdit ? true : null);
  const [dirty, setDirty] = useState<boolean>(false);

  const titleVal = watch('title') ?? '';
  const excerptVal = watch('excerpt') ?? '';
  const categoryId = watch('categoryId') ?? '';
  const videoUrlVal = (watch('videoUrl') ?? '').trim();

  const autoSlug = useMemo(() => makeSlug(titleVal), [titleVal]);
  const visibleSlug = isEdit && defaultData.slug ? defaultData.slug : autoSlug;

  const wordsCount = useMemo(
    () => content.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length,
    [content],
  );
  const reading = readingTimeFromHtml(content, text.readTime);

  /* -------------------------- draft key -------------------------- */
  const draftKey = useMemo(
    () => makeDraftKey(locale, mode, defaultData.slug),
    [locale, mode, defaultData.slug],
  );

  /* -------------------- Fresh "create" session reset -------------------- */
  useEffect(() => {
    if (mode !== 'create') return;
    clearDraft(draftKey);
    reset({ title: '', excerpt: '', categoryId: '', videoUrl: '' });
    setContent('');
    setCover('');
    setCoverPosition({ x: 50, y: 50 });
    setIsVideoOnly(false);
    setSlugAvailable(null);
    setDirty(false);
    setLastSavedAt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, locale]);

  /* ----------------------- restore draft (edit only) ----------------------- */
  useEffect(() => {
    if (mode !== 'edit') return;
    const draft = readDraft(draftKey);
    if (!draft) return;
    setValue('title', draft.data.title, { shouldDirty: true });
    setValue('excerpt', draft.data.excerpt, { shouldDirty: true });
    setValue('categoryId', draft.data.categoryId, { shouldDirty: true });
    setValue('videoUrl', draft.data.videoUrl, { shouldDirty: true });
    setContent(draft.data.content);
    setCover(draft.data.cover);
    setCoverPosition(draft.data.coverPosition);
    setIsVideoOnly(draft.data.isVideoOnly);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey, mode]);

  /* --------------------------- persist draft -------------------------- */
  const persistDraft = useCallback(() => {
    const blob: DraftBlob = {
      ver: 1,
      savedAt: Date.now(),
      data: {
        title: titleVal,
        excerpt: excerptVal,
        content,
        categoryId,
        cover,
        coverPosition,
        videoUrl: videoUrlVal,
        isVideoOnly,
      },
    };
    writeDraft(draftKey, blob);
  }, [
    titleVal,
    excerptVal,
    content,
    categoryId,
    cover,
    coverPosition,
    videoUrlVal,
    isVideoOnly,
    draftKey,
  ]);

  const debouncedPersistDraft = useDebouncedCallback(persistDraft, 400);
  useEffect(() => {
    debouncedPersistDraft();
  }, [
    titleVal,
    excerptVal,
    content,
    categoryId,
    cover,
    coverPosition,
    videoUrlVal,
    isVideoOnly,
    debouncedPersistDraft,
  ]);

  useEffect(() => {
    const onHide = () => persistDraft();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, [persistDraft]);

  /* -------------------------- autosave to server -------------------------- */
  useEffect(() => {
    if (videoUrlVal && !isVideoOnly) setIsVideoOnly(true);
    if (!videoUrlVal && isVideoOnly && initialVideoOnly) setIsVideoOnly(false);
  }, [videoUrlVal, isVideoOnly, initialVideoOnly]);

  const basicsReady = isVideoOnly
    ? lenGT3(titleVal) && videoUrlVal.length > 0
    : lenGT3(titleVal) && lenGT3(excerptVal) && lenGT3(categoryId);

  const canSubmit = basicsReady && !isSubmitting && (isEdit || slugAvailable !== false);

  const checkSlugAvailability = useCallback(
    async (slug: string) => {
      if (!slug || slug.length < 3) return setSlugAvailable(null);
      if (isEdit && defaultData.slug === slug) return setSlugAvailable(true);
      try {
        const r = await fetch(`/api/admin/articles/slug?slug=${encodeURIComponent(slug)}`);
        if (r.ok) {
          const out: SlugCheckResponse = await r.json();
          setSlugAvailable(out.exists === false);
        }
      } catch {
        // ignore
      }
    },
    [isEdit, defaultData?.slug],
  );

  const debouncedCheckSlug = useDebouncedCallback(checkSlugAvailability, 450);
  useEffect(() => {
    debouncedCheckSlug(visibleSlug);
  }, [visibleSlug, debouncedCheckSlug]);

  useEffect(() => {
    setDirty(true);
  }, [titleVal, excerptVal, content, categoryId, cover, coverPosition, isVideoOnly]);

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

  // AUTOSAVE (EDIT ONLY) — مع الحفاظ على الـ slug
  const autosave = useCallback(async () => {
    if (!isEdit) return;
    if (!basicsReady || slugAvailable === false) return;

    const payload = {
      title: titleVal,
      excerpt: excerptVal,
      content: isVideoOnly ? '' : content,
      categoryId: isVideoOnly ? undefined : categoryId || undefined,
      coverUrl: cover || undefined,
      videoUrl: videoUrlVal || undefined,
      readingTime: isVideoOnly ? undefined : reading,
      isVideoOnly,
      meta: { ...(defaultData.meta || {}), coverPosition },
      // 👇 أهم شيء هنا
      preserveSlug: true,
    };

    try {
      setSaving(true);
      const r = await fetch(`/api/admin/articles/${encodeURIComponent(visibleSlug)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        await r.json().catch(() => ({} as UpdateResponse));
        setDirty(false);
        setLastSavedAt(new Date());
        // لا يوجد توجيه هنا إطلاقًا في autosave
        // وحتى السيرفر لن يغير الـ slug عند preserveSlug=true
        clearDraft(draftKey);
      }
    } finally {
      setSaving(false);
    }
  }, [
    isEdit,
    basicsReady,
    slugAvailable,
    defaultData,
    titleVal,
    excerptVal,
    content,
    categoryId,
    cover,
    reading,
    visibleSlug,
    videoUrlVal,
    coverPosition,
    isVideoOnly,
    draftKey,
  ]);

  // debounce بسيط بالتايمر
  useEffect(() => {
    if (!isEdit) return;
    const id = window.setTimeout(() => {
      void autosave();
    }, 1200);
    return () => window.clearTimeout(id);
  }, [
    isEdit,
    titleVal,
    excerptVal,
    content,
    categoryId,
    cover,
    coverPosition,
    isVideoOnly,
    videoUrlVal,
    autosave,
  ]);

  /* --------------------------- keyboard save --------------------------- */
  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
    const saveCombo =
      (isMac && e.metaKey && e.key.toLowerCase() === 's') ||
      (!isMac && e.ctrlKey && e.key.toLowerCase() === 's');
    if (saveCombo) {
      e.preventDefault();
      handleSubmit(onSubmit)();
    }
  };

  /* ------------------------------ submit ------------------------------ */
  const onSubmit = async (fv: FormValues) => {
    if (!isEdit && slugAvailable === false) return toast.error(text.slugInUse);
    if (isVideoOnly && !videoUrlVal)
      return toast.error(locale === 'pl' ? 'Wymagany link do wideo' : 'Video URL is required for video-only');
    if (!isVideoOnly && !lenGT3(fv.categoryId || ''))
      return toast.error(locale === 'pl' ? 'Wybierz kategorię' : 'Please pick a category');
    if (!isVideoOnly && !lenGT3(fv.excerpt || ''))
      return toast.error(locale === 'pl' ? 'Dodaj opis (min 4 znaki)' : 'Please add a summary (min 4 chars)');

    const slugForSubmit = isEdit ? visibleSlug : makeSlug(fv.title);
    const payload = {
      title: fv.title,
      excerpt: fv.excerpt,
      content: isVideoOnly ? '' : content,
      categoryId: isVideoOnly ? undefined : fv.categoryId || undefined,
      coverUrl: cover || undefined,
      videoUrl: videoUrlVal || undefined,
      readingTime: isVideoOnly ? undefined : reading,
      isVideoOnly,
      meta: { ...(defaultData.meta || {}), coverPosition },
      // لا نرسل preserveSlug هنا (manual save يسمح بتغيير الـ slug)
    };

    const res = await fetch(`/api/admin/articles/${encodeURIComponent(slugForSubmit)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const out: UpdateResponse = await res.json().catch(() => ({} as UpdateResponse));
    if (!res.ok) return toast.error(out.error || 'error');

    if (out.slugChanged && out.newSlug) {
      toast.success(isEdit ? text.save : text.create);
      const newKey = makeDraftKey(locale, 'edit', out.newSlug);
      const existing = readDraft(draftKey);
      if (existing) writeDraft(newKey, existing);
      clearDraft(draftKey);

      onSaved?.(out.newSlug);
      router.push(`/${locale}/admin/articles/${out.newSlug}/edit`);
      return;
    }

    toast.success(isEdit ? text.save : text.create);

    if (!isEdit) {
      onSaved?.(slugForSubmit);
      const editKey = makeDraftKey(locale, 'edit', slugForSubmit);
      const existing = readDraft(draftKey);
      if (existing) writeDraft(editKey, existing);
      clearDraft(draftKey);
      router.push(`/${locale}/admin/articles/${slugForSubmit}/edit`);
    } else {
      setDirty(false);
      setLastSavedAt(new Date());
      clearDraft(draftKey);
      router.refresh();
    }
  };

  const stats = `${wordsCount} ${text.words} • ${reading}`;

  const formKey = useMemo(
    () => `${mode}:${defaultData.slug ?? 'new'}:${locale}`,
    [mode, defaultData.slug, locale],
  );

  return (
    <form
      key={formKey}
      onSubmit={handleSubmit(onSubmit)}
      onKeyDown={onKeyDown}
      className="space-y-4 max-w-7xl mx-auto p-1 bg-white/80 dark:bg-zinc-900/80
                 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm"
    >
      <TitleSlug
        register={register}
        errors={errors}
        titleLen={(watch('title') || '').length}
        slug={visibleSlug}
        placeholder={text.title}
      />

      <Excerpt
        registerExcerpt={(name: Parameters<typeof register>[0]) => register(name)}
        errorMessage={
          typeof errors.excerpt?.message === 'string'
            ? errors.excerpt.message
            : errors.excerpt?.message
              ? String(errors.excerpt.message)
              : undefined
        }
        valueLen={(watch('excerpt') || '').length}
        placeholder={text.excerpt}
        videoOnly={isVideoOnly}
        notePL="Tryb tylko wideo — opis jest opcjonalny."
        noteEN="Video-only mode — summary is optional."
      />

      <CategorySelect
        label={text.cat}
        register={register}
        errors={errors}
        disabled={isVideoOnly}
      />

      <VideoSection
        checked={isVideoOnly}
        onToggle={setIsVideoOnly}
        label={text.videoOnly}
        hint={text.videoOnlyHint}
        urlLabel={text.videoUrlLabel}
        register={register}
      />

      {!isVideoOnly ? (
        <EditorBox content={content} setContent={setContent} stats={stats} />
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-zinc-700 p-3 text-sm text-gray-500 dark:text-gray-400">
          {locale === 'pl'
            ? 'Tryb tylko wideo — edytor tekstu ukryty.'
            : 'Video-only mode — text editor hidden.'}
        </div>
      )}

      <CoverUploader
        locale={locale}
        cover={cover}
        setCover={setCover}
        coverPosition={coverPosition}
        setCoverPosition={setCoverPosition}
        label={text.cover}
      />

      <StatusBar
        saving={saving}
        dirty={dirty}
        dirtyCount={Object.keys(dirtyFields).length}
        savedAtText={!saving && !dirty && lastSavedAt ? text.savedAt(lastSavedAt.toLocaleTimeString()) : null}
        unsavedText={text.unsaved}
      />

      <SaveFab
        disabled={!canSubmit || isSubmitting}
        busy={isSubmitting}
        label={isEdit ? text.save : text.create}
      />
    </form>
  );
}
