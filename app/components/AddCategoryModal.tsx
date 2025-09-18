// app/components/AddCategoryModal.tsx
'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { Plus, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';

/* ---------- Types (اسم واحد بلا لغات) ---------- */
export type Locale = 'en' | 'pl';

export type Category = {
  _id: string;
  name: string;          // ← اسم واحد فقط
  slug: string;
  createdAt: string;
  updatedAt: string;
};

/* ---------- i18n للنصوص الظاهرة فقط ---------- */
const TR: Record<Locale, Record<string, string>> = {
  en: {
    add: 'Add Category',
    name: 'Name',
    slug: 'Slug',
    save: 'Save',
    saved: 'Category added',
    err: 'Save error',
  },
  pl: {
    add: 'Dodaj kategorię',
    name: 'Nazwa',
    slug: 'Slug',
    save: 'Zapisz',
    saved: 'Dodano kategorię',
    err: 'Błąd zapisu',
  },
};

/* ---------- التحقق ---------- */
const schema = z.object({
  name: z.string().trim().min(2, 'Min 2 characters'),
  slug: z.string().trim().min(2, 'Min 2 characters').regex(/^[a-z0-9-]+$/, 'Use a-z, 0-9, -'),
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
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', slug: '' },
  });

  // توليد slug تلقائي حتى يقرر المستخدم التعديل اليدوي
  const nameVal = watch('name');
  const slugVal = watch('slug');
  const [slugTouched, setSlugTouched] = useState(false);

  const autoSlug = useMemo(
    () =>
      (nameVal ?? '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, ''),
    [nameVal],
  );

  useEffect(() => {
    // حدّث slug تلقائيًا فقط لو المستخدم لم يلمس حقل slug أو الحقل فارغ
    if (!slugTouched || !slugVal) {
      setValue('slug', autoSlug, { shouldValidate: true });
    }
  }, [autoSlug, slugTouched, slugVal, setValue]);

  const onSlugChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setSlugTouched(true);
    // نسمح بأي كتابة ولكن نطبّق نفس قواعد التنظيف البسيطة
    const cleaned = e.target.value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    setValue('slug', cleaned, { shouldValidate: true });
  };

  const submit = async (data: FormData) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // API الإدارة تقبل name فقط — هي من تتولى إنشاء الـ slug إن لم تُرسله.
        body: JSON.stringify({ name: data.name, slug: data.slug }),
      });

      const json = (await res.json().catch(() => ({}))) as
        | Category
        | { error?: string };

      if (!res.ok) {
        throw new Error((json as { error?: string }).error ?? 'Unknown server error');
      }

      toast.success(t.saved);
      onCreated(json as Category);
      setOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`${t.err}: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* زر الفتح */}
      <button
        onClick={() => {
          setOpen(true);
          // إعادة الضبط عند الفتح
          setSlugTouched(false);
        }}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
      >
        <Plus className="w-4 h-4" /> {t.add}
      </button>

      {/* المودال */}
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
                  {/* Name (واحد فقط) */}
                  <div>
                    <input
                      placeholder={t.name}
                      {...register('name')}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Slug */}
                  <div>
                    <input
                      placeholder={t.slug}
                      value={slugVal}
                      onChange={onSlugChange}
                      onFocus={() => setSlugTouched(true)}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md"
                    />
                    {errors.slug && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.slug.message}
                      </p>
                    )}
                  </div>

                  <button
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 py-2 rounded-md disabled:opacity-60"
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
