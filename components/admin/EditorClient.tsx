'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import slugify from 'slugify';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { PAGES, PageKey } from '@/types/constants/pages';
import type { ArticleDoc, Locale } from '@/types/core/article';

const TipTapEditor = dynamic(() => import('@/app/components/TipTapEditor'), {
  ssr: false,
});

/** 1) schema يتضمّن title و excerpt */
const schema = z.object({
  title:     z.string().min(3, 'Title too short'),
  excerpt:   z.string().min(10, 'Excerpt min 10').max(300, 'Max 300 chars'),
  categoryId:z.string().min(1, 'Select category'),
  pageKey:   z.enum(PAGES.map(p => p.key) as [PageKey, ...PageKey[]]),
  videoUrl:  z.string().url('Invalid URL').optional().or(z.literal('')),
  published: z.boolean(),
});
type FormData = z.infer<typeof schema>;

interface Category {
  _id: string;
  name: Record<Locale, string>;
  pageKey?: PageKey;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function EditorClient({ locale }: { locale: Locale }) {
  const router = useRouter();

  const [content, setContent]         = useState<string>('');
  const [coverUrl, setCoverUrl]       = useState<string>('');
  const [uploading, setUploading]     = useState<boolean>(false);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { pageKey: 'multi', published: false },
  });

  const pageWatch = watch('pageKey');

  /** جلب الفئات عند تغيير الصفحة */
  const loadCats = useCallback(async (pg: PageKey) => {
    setLoadingCats(true);
    try {
      const res = await fetch(`/api/categories?page=${pg}`);
      if (!res.ok) throw new Error('Categories fetch failed');
      const data: Category[] = await res.json();
      setCategories(data);
      const cur = watch('categoryId');
      if (cur && !data.some(c => c._id === cur)) {
        setValue('categoryId', '');
      }
    } catch {
      toast.error('Categories error');
      setCategories([]);
      setValue('categoryId', '');
    } finally {
      setLoadingCats(false);
    }
  }, [setValue, watch]);

  useEffect(() => {
    loadCats(pageWatch);
  }, [pageWatch, loadCats]);

  /** رفع الصورة */
  const onDrop = useCallback(async (files: File[]) => {
    if (!files.length) return;
    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Max 5MB');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const out = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(out.error || `Upload failed (${res.status})`);
      if (!out.url) throw new Error('No URL returned');
      setCoverUrl(out.url);
      toast.success('Image uploaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload error');
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: 5 * 1024 * 1024,
  });

  const removeCover = () => setCoverUrl('');

  /** إرسال النموذج */
  const onSubmit: SubmitHandler<FormData> = async d => {
    if (uploading) {
      toast.error('Wait for image upload...');
      return;
    }
    if (!stripHtml(content)) {
      toast.error('Content is empty');
      return;
    }

    const payload: Omit<ArticleDoc, '_id' | 'createdAt' | 'updatedAt'> = {
      slug:           slugify(d.title, { lower: true, strict: true }),
      title:          d.title.trim(),            // الآن string عوض Record
      description:    d.excerpt.trim(),          // excerpt → description
      contentHtml:    content,
      locale,
      pageKey:        d.pageKey,
      status:         d.published ? 'published' : 'draft',
      authorId:       '',                        // يُضبط على السيرفر
      categories:     [],                        // يجري تجاهلها أو إعادة خريطة
      tags:           [],
      heroImageUrl:   coverUrl || undefined,
      thumbnailUrl:   undefined,
      publishedAt:    d.published ? new Date().toISOString() : undefined,
      scheduledFor:   undefined,
      revision:       1,
      meta:           {},
      metrics:        {},
      videoUrl:       d.videoUrl?.trim() || undefined,
    };

    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Server error');
      }
      toast.success(locale === 'pl' ? '✅ Zapisano!' : '✅ Saved');
      router.push('/admin/articles');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Network error');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* العنوان */}
      <input
        {...register('title')}
        placeholder={locale === 'pl' ? 'Tytuł' : 'Title'}
        className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-200 outline-none"
      />
      {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}

      {/* المقتطف */}
      <textarea
        {...register('excerpt')}
        rows={3}
        placeholder={locale === 'pl' ? 'Krótki opis' : 'Short excerpt'}
        className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-200 outline-none"
      />
      {errors.excerpt && <p className="text-red-500 text-sm">{errors.excerpt.message}</p>}

      {/* المحرر */}
      <TipTapEditor content={content} setContent={setContent} />

      {/* رفع الغلاف */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed p-4 rounded text-center cursor-pointer transition ${
          isDragActive ? 'bg-blue-50 border-blue-400' : 'border-zinc-300'
        } ${uploading ? 'opacity-60' : ''}`}
      >
        <input {...getInputProps()} />
        {uploading
          ? locale === 'pl'
            ? 'Trwa przesyłanie…'
            : 'Uploading…'
          : locale === 'pl'
          ? 'Kliknij lub upuść zdjęcie'
          : 'Click or drop cover image'}
      </div>
{coverUrl && (
  <div className="relative inline-block">
    <Image
      src={coverUrl}
      alt="cover"
      width={768}                 // اختر قيماً معقولة
      height={384}
      className="mt-2 h-48 w-auto rounded shadow object-cover"
    />
    <button
      type="button"
      onClick={removeCover}
      className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded"
    >
      {locale === 'pl' ? 'Usuń' : 'Remove'}
    </button>
  </div>
)}


      {/* الصفحة والفئة */}
      <div className="grid md:grid-cols-2 gap-4">
        <select
          {...register('pageKey')}
          className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-200 outline-none"
        >
          {PAGES.map(p => (
            <option key={p.key} value={p.key}>
              {locale === 'pl' ? p.labelPl : p.labelEn}
            </option>
          ))}
        </select>
        <select
          {...register('categoryId')}
          className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-200 outline-none"
        >
          <option value="">
            {loadingCats
              ? locale === 'pl'
                ? 'Ładowanie…'
                : 'Loading…'
              : locale === 'pl'
              ? 'Wybierz kategorię'
              : 'Select category'}
          </option>
          {categories.map(c => (
            <option key={c._id} value={c._id}>
              {c.name[locale] ?? c._id.slice(0, 6)}
            </option>
          ))}
        </select>
      </div>

      {/* رابط الفيديو */}
      <input
        {...register('videoUrl')}
        placeholder={locale === 'pl' ? 'Adres wideo (opc.)' : 'Video URL (opt.)'}
        className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-200 outline-none"
      />
      {errors.videoUrl && <p className="text-red-500 text-sm">{errors.videoUrl.message}</p>}

      {/* النشر */}
      <label className="flex items-center gap-2">
        <input type="checkbox" {...register('published')} />
        {locale === 'pl' ? 'Opublikowany' : 'Published'}
      </label>

      {/* زر الحفظ */}
      <button
        type="submit"
        disabled={isSubmitting || uploading}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-6 py-2 rounded shadow"
      >
        {isSubmitting
          ? locale === 'pl'
            ? 'Zapisywanie…'
            : 'Saving…'
          : locale === 'pl'
          ? 'Zapisz'
          : 'Save'}
      </button>
    </form>
  );
}
