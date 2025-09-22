//E:\trifuzja-mix\app\components\ArticleEditor.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback, KeyboardEvent } from 'react';
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
import { ArticleFormSchema as schema, type ArticleFormValues as FormValues } from '@/app/components/editor/article.schema';
import { makeSlug, readingTimeFromHtml, lenGT3, fromAny } from '@/app/components/editor/helpers';
import { useDebouncedCallback } from '@/app/components/editor/hooks';

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

  const {
    register,
    handleSubmit,
    watch,
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

  const initialContent = fromAny(defaultData.content, locale);
  const [content, setContent] = useState(initialContent);
  const [cover, setCover] = useState(defaultData.coverUrl ?? '');

  const [coverPosition, setCoverPosition] = useState<CoverPosition>(() => {
    const pos = defaultData.meta?.coverPosition;
    if (pos === 'top') return { x: 50, y: 0 };
    if (pos === 'bottom') return { x: 50, y: 100 };
    if (typeof pos === 'object' && pos && 'x' in pos && 'y' in pos) return pos as CoverPosition;
    return { x: 50, y: 50 };
  });

  const initialVideoOnly = Boolean(defaultData.videoUrl);
  const [isVideoOnly, setIsVideoOnly] = useState(initialVideoOnly);

  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(isEdit ? true : null);
  const [dirty, setDirty] = useState(false);

  const titleVal    = watch('title');
  const excerptVal  = watch('excerpt') || '';
  const categoryId  = watch('categoryId') || '';
  const videoUrlVal = (watch('videoUrl') || '').trim();

  const autoSlug    = useMemo(() => makeSlug(titleVal), [titleVal]);
  const visibleSlug = isEdit ? (defaultData.slug as string) : autoSlug;

  const wordsCount = useMemo(
    () => content.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length,
    [content],
  );
  const reading = readingTimeFromHtml(content, text.readTime);

  useEffect(() => {
    // التبديل التلقائي لوضع الفيديو فقط عند وجود رابط فيديو
    if (videoUrlVal && !isVideoOnly) setIsVideoOnly(true);
    // الرجوع تلقائياً لو اتشال الفيديو وكان الأصل فيديو فقط
    if (!videoUrlVal && isVideoOnly && initialVideoOnly) setIsVideoOnly(false);
  }, [videoUrlVal, isVideoOnly, initialVideoOnly]);

  // الشروط الأساسية: في الفيديو فقط لا نطلب excerpt ولا category
  const basicsReady = isVideoOnly
    ? lenGT3(titleVal) && videoUrlVal.length > 0
    : lenGT3(titleVal) && lenGT3(excerptVal) && lenGT3(categoryId);

  const canSubmit = basicsReady && !isSubmitting && (isEdit || slugAvailable !== false);

  // فحص توفر السِلغ
  const checkSlugAvailability = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) return setSlugAvailable(null);
    if (isEdit && defaultData.slug === slug) return setSlugAvailable(true);
    try {
      const r = await fetch(`/api/admin/articles/slug?slug=${encodeURIComponent(slug)}`);
      if (r.ok) {
        const out = (await r.json()) as { exists?: boolean };
        setSlugAvailable(out.exists === false);
      }
    } catch {}
  }, [isEdit, defaultData?.slug]);

  const debouncedCheckSlug = useDebouncedCallback(checkSlugAvailability, 450);
  useEffect(() => { debouncedCheckSlug(visibleSlug); }, [visibleSlug, debouncedCheckSlug]);

  useEffect(() => { setDirty(true); }, [titleVal, excerptVal, content, categoryId, cover, coverPosition, isVideoOnly]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // أوتوسيف: لا نحذف excerpt أبداً — بس نخلي الـ content فاضي في وضع الفيديو
  const autosave = useCallback(async () => {
    if (!basicsReady || (!isEdit && slugAvailable === false)) return;

    const payload = {
      title: titleVal,
      excerpt: excerptVal,                    // ← دائماً معانا حتى في الفيديو فقط
      content: isVideoOnly ? '' : content,    // ← النص فقط إن لم يكن فيديو فقط
      categoryId: isVideoOnly ? undefined : categoryId || undefined,
      coverUrl: cover || undefined,
      videoUrl: videoUrlVal || undefined,
      readingTime: isVideoOnly ? undefined : reading,
      isVideoOnly,
      meta: { ...(defaultData.meta || {}), coverPosition },
    };

    try {
      setSaving(true);
      const r = await fetch(`/api/admin/articles/${encodeURIComponent(visibleSlug)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (r.ok) { setDirty(false); setLastSavedAt(new Date()); }
    } finally { setSaving(false); }
  }, [basicsReady, isEdit, slugAvailable, defaultData, titleVal, excerptVal, content, categoryId, cover, reading, visibleSlug, videoUrlVal, coverPosition, isVideoOnly]);

  const debouncedAutosave = useDebouncedCallback(autosave, 1200);
  useEffect(() => {
    debouncedAutosave();
  }, [titleVal, excerptVal, content, categoryId, cover, coverPosition, isVideoOnly, videoUrlVal, debouncedAutosave]);

  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
    const saveCombo = (isMac && e.metaKey && e.key.toLowerCase() === 's') || (!isMac && e.ctrlKey && e.key.toLowerCase() === 's');
    if (saveCombo) { e.preventDefault(); handleSubmit(onSubmit)(); }
  };

  const onSubmit = async (fv: FormValues) => {
    if (!isEdit && slugAvailable === false) return toast.error(text.slugInUse);
    if (isVideoOnly && !videoUrlVal) return toast.error(locale === 'pl' ? 'Wymagany link do wideo' : 'Video URL is required for video-only');
    if (!isVideoOnly && !lenGT3(fv.categoryId || '')) return toast.error(locale === 'pl' ? 'Wybierz kategorię' : 'Please pick a category');
    if (!isVideoOnly && !lenGT3(fv.excerpt || '')) return toast.error(locale === 'pl' ? 'Dodaj opis (min 4 znaki)' : 'Please add a summary (min 4 chars)');

    const slugForSubmit = visibleSlug;
    const payload = {
      title: fv.title,
      excerpt: fv.excerpt,                     // ← دائماً ناخده
      content: isVideoOnly ? '' : content,
      categoryId: isVideoOnly ? undefined : fv.categoryId || undefined,
      coverUrl: cover || undefined,
      videoUrl: videoUrlVal || undefined,
      readingTime: isVideoOnly ? undefined : reading,
      isVideoOnly,
      meta: { ...(defaultData.meta || {}), coverPosition },
    };

    const res = await fetch(`/api/admin/articles/${encodeURIComponent(slugForSubmit)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({} as { error?: string }));
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

  const stats = `${wordsCount} ${text.words} • ${reading}`;

  return (
    <form
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
  registerExcerpt={(name) => register(name)}            // 👈 نمرر wrapper لحقل excerpt
  errorMessage={
    typeof errors.excerpt?.message === 'string'
      ? errors.excerpt.message
      : errors.excerpt?.message
        ? String(errors.excerpt.message)
        : undefined
  }
  valueLen={(watch('excerpt') || '').length}
  placeholder={text.excerpt}
  videoOnly={isVideoOnly}           // يبقى اختياري في وضع الفيديو
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
          {locale === 'pl' ? 'Tryb tylko wideo — edytor tekstu ukryty.' : 'Video-only mode — text editor hidden.'}
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

      <SaveFab disabled={!canSubmit || isSubmitting} busy={isSubmitting} label={isEdit ? text.save : text.create} />
    </form>
  );
}
