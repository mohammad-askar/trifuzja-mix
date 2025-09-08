'use client';

import { Fragment, useState } from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,    // ✅ المكوّن الجديد
} from '@headlessui/react';
import { Plus, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';

/* ---------- Types ---------- */
export type Locale = 'en' | 'pl';
export type Category = {
  _id: string;
  name: { en: string; pl: string };
  slug: string;
  createdAt: string;
  updatedAt: string;
};

/* ---------- Translations ---------- */
const TR: Record<Locale, Record<string, string>> = {
  en: {
    add: 'Add Category',
    nameEn: 'Name (EN)',
    namePl: 'Name (PL)',
    slug: 'Slug',
    save: 'Save',
    saved: 'Category added',
    err: 'Save error',
  },
  pl: {
    add: 'Dodaj kategorię',
    nameEn: 'Nazwa (EN)',
    namePl: 'Nazwa (PL)',
    slug: 'Slug',
    save: 'Zapisz',
    saved: 'Dodano kategorię',
    err: 'Błąd zapisu',
  },
};

/* ---------- Validation ---------- */
const schema = z.object({
  en: z.string().min(2),
  pl: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
});
type FormData = z.infer<typeof schema>;

interface Props {
  locale: Locale;
  onCreated: (c: Category) => void;
}

/* ---------- Component ---------- */
export default function AddCategoryModal({ locale, onCreated }: Props) {
  const t = TR[locale];

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  /* auto-slug */
  const enName = watch('en');
  const autoSlug =
    enName
      ?.toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '') || '';
  if (enName && !watch('slug')) setValue('slug', autoSlug);

const submit = async (data: FormData) => {
  setSaving(true);

  try {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: { en: data.en, pl: data.pl },
        slug: data.slug,
      }),
    });

    // نحصل دائمًا على JSON سواء نجح الطلب أو فشل
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      /* الخادم أعاد رسالة خطأ واضحة */
      throw new Error(json.error ?? 'Unknown server error');
    }

    /* نجح الإدخال ويحتوي json على الكائن الكامل */
    toast.success(t.saved);                // ✅ إشعار أخضر
    onCreated(json as Category);           // إضافة مباشرةً للجدول
    setOpen(false);
  } catch (err: any) {
    toast.error(`${t.err}: ${err.message}`); // ❌ إشعار أحمر
  } finally {
    setSaving(false);
  }
};


  return (
    <>
      {/* trigger */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
      >
        <Plus className="w-4 h-4" /> {t.add}
      </button>

      {/* modal */}
      <Transition show={open} as={Fragment}>
        <Dialog onClose={() => setOpen(false)} className="fixed inset-0 z-50">
          <div className="min-h-screen flex items-center justify-center p-4 bg-black/50">
            <TransitionChild
              as={Fragment}
              enter="duration-200 ease-out"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="duration-150 ease-in"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md bg-gray-900 p-6 text-gray-200 rounded-lg border border-gray-700">
                <DialogTitle className="text-lg font-semibold mb-4">
                  {t.add}
                </DialogTitle>

                <form onSubmit={handleSubmit(submit)} className="space-y-4">
                  <div>
                    <input
                      placeholder={t.nameEn}
                      {...register('en')}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md"
                    />
                    {errors.en && (
                      <p className="text-red-500 text-xs mt-1">{errors.en.message}</p>
                    )}
                  </div>

                  <div>
                    <input
                      placeholder={t.namePl}
                      {...register('pl')}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md"
                    />
                    {errors.pl && (
                      <p className="text-red-500 text-xs mt-1">{errors.pl.message}</p>
                    )}
                  </div>

                  <div>
                    <input
                      placeholder={t.slug}
                      {...register('slug')}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md"
                    />
                    {errors.slug && (
                      <p className="text-red-500 text-xs mt-1">{errors.slug.message}</p>
                    )}
                  </div>

                  <button
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 py-2 rounded-md"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {t.save}
                  </button>
                </form>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
