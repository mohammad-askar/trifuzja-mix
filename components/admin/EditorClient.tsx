// components/admin/EditorClient.tsx
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

type Locale = 'en' | 'pl';

const TipTapEditor = dynamic(() => import('@/app/components/TipTapEditor'), {
  ssr: false,
});

/* ------------------------- Validation Schema ------------------------- */
/** Note: removed videoUrl support */
const schema = z.object({
  title: z.string().trim().min(3, 'Title too short'),
  excerpt: z.string().trim().min(10, 'Excerpt min 10').max(300, 'Max 300 chars'),
  categoryId: z.string().trim().min(1, 'Select category'),
});

type FormData = z.infer<typeof schema>;

/* ------------------------------ Types ------------------------------- */
interface Category {
  _id: string;
  name: Record<Locale, string>;
}

interface UploadResponse {
  url?: string;
  error?: string;
}

/* ----------------------------- Helpers ------------------------------ */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/* ----------------------------- Component ---------------------------- */
export default function EditorClient({ locale }: { locale: Locale }) {
  const router = useRouter();

  const [content, setContent] = useState<string>('');
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  /* --------------------------- Load categories --------------------------- */
  const loadCats = useCallback(async () => {
    setLoadingCats(true);
    try {
      const res = await fetch('/api/categories', { cache: 'no-store' });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as Category[];
      setCategories(data);
    } catch (e) {
      console.error(e);
      toast.error(locale === 'pl' ? 'Błąd kategorii' : 'Categories error');
      setCategories([]);
    } finally {
      setLoadingCats(false);
    }
  }, [locale]);

  useEffect(() => {
    void loadCats();
  }, [loadCats]);

  /* ------------------------------ Upload ------------------------------- */
  const onDrop = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      const file = files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error(locale === 'pl' ? 'Maks 5MB' : 'Max 5MB');
        return;
      }
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const out = (await res.json()) as UploadResponse;
        if (!res.ok) throw new Error(out.error || `Upload failed (${res.status})`);
        if (!out.url) throw new Error('No URL returned');
        setCoverUrl(out.url);
        toast.success(locale === 'pl' ? 'Przesłano obraz' : 'Image uploaded');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Upload error');
      } finally {
        setUploading(false);
      }
    },
    [locale],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: 5 * 1024 * 1024,
  });

  const removeCover = () => setCoverUrl('');

  /* ------------------------------ Submit ------------------------------ */
  /**
   * We send title/excerpt/content as Record {en,pl} with the same value
   * for compatibility with the current API.
   */
  const onSubmit: SubmitHandler<FormData> = async (d) => {
    if (uploading) {
      toast.error(locale === 'pl' ? 'Poczekaj na przesyłanie…' : 'Wait for image upload…');
      return;
    }
    if (!stripHtml(content)) {
      toast.error(locale === 'pl' ? 'Treść jest pusta' : 'Content is empty');
      return;
    }

    const titleRec: Record<Locale, string> = { en: d.title.trim(), pl: d.title.trim() };
    const excerptRec: Record<Locale, string> = { en: d.excerpt.trim(), pl: d.excerpt.trim() };
    const contentRec: Record<Locale, string> = { en: content, pl: content };

    const payload = {
      slug: slugify(d.title, { lower: true, strict: true }),
      title: titleRec,
      excerpt: excerptRec,
      content: contentRec,
      categoryId: d.categoryId,
      coverUrl: coverUrl || undefined,
      // meta: add coverPosition later if needed
    };

    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const errJson = (await res.json().catch(() => ({}))) as { error?: string; slug?: string };
      if (!res.ok) throw new Error(errJson.error || 'Server error');

      toast.success(locale === 'pl' ? '✅ Zapisano!' : '✅ Saved');
      router.push(`/${locale}/admin/articles`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Network error');
    }
  };

  /* --------------------------------- UI -------------------------------- */
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Title */}
      <input
        {...register('title')}
        placeholder={locale === 'pl' ? 'Tytuł' : 'Title'}
        className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-200 outline-none"
      />
      {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}

      {/* Excerpt */}
      <textarea
        {...register('excerpt')}
        rows={3}
        placeholder={locale === 'pl' ? 'Krótki opis' : 'Short excerpt'}
        className="w-full border rounded px-3 py-2 focus:ring focus:ring-blue-200 outline-none"
      />
      {errors.excerpt && <p className="text-red-500 text-sm">{errors.excerpt.message}</p>}

      {/* Editor */}
      <TipTapEditor content={content} setContent={setContent} />

      {/* Cover upload */}
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
            width={768}
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

      {/* Category */}
      <div className="grid md:grid-cols-1 gap-4">
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
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name[locale] ?? c.name.en ?? c._id.slice(0, 6)}
            </option>
          ))}
        </select>
      </div>

      {/* Save button */}
      <button
        type="submit"
        disabled={isSubmitting || uploading}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-6 py-2 rounded shadow"
      >
        {isSubmitting ? (locale === 'pl' ? 'Zapisywanie…' : 'Saving…') : locale === 'pl' ? 'Zapisz' : 'Save'}
      </button>
    </form>
  );
}
