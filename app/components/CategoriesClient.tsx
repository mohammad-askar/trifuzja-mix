'use client';

import { useEffect, useState } from 'react';
import { FolderKanban, Trash2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

type Locale = 'en' | 'pl';

type Category = {
  _id: string;
  nameEn: string;
  namePl: string;
};

export default function CategoriesClient({ locale }: { locale: Locale }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [nameEN, setNameEN] = useState('');
  const [namePL, setNamePL] = useState('');
  const [loading, setLoading] = useState(false);

  /* تحميل الفئات مرّة واحدة */
  useEffect(() => {
    fetchCategories();
  }, []);

  /* ---------- helpers ---------- */
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error();
      setCategories(await res.json());
    } catch {
      toast.error('Failed to load categories');
    }
  };

  const resetInputs = () => {
    setNameEN('');
    setNamePL('');
  };

  /* ---------- إضافة ---------- */
  const handleAdd = async () => {
    if (!nameEN.trim() || !namePL.trim()) {
      toast.error('Enter names in both languages');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameEn: nameEN.trim(), namePl: namePL.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success('Added!');
      resetInputs();
      fetchCategories();
    } catch {
      toast.error('Add failed');
    } finally {
      setLoading(false);
    }
  };

  /* ---------- حذف ---------- */
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Deleted');
      fetchCategories();
    } catch {
      toast.error('Delete failed');
    } finally {
      setLoading(false);
    }
  };

  /* ---------- واجهة ---------- */
  return (
    <main className="max-w-4xl mx-auto px-4 pt-24 pb-16">
      <Toaster position="top-right" />

      <h1 className="text-3xl font-bold mb-8 text-center">
        {locale === 'pl' ? 'Zarządzaj kategoriami' : 'Manage Categories'}
      </h1>

      {/* نموذج الإضافة */}
      <div className="bg-white dark:bg-zinc-900 border p-6 rounded-xl shadow mb-10 space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <input
            value={nameEN}
            onChange={(e) => setNameEN(e.target.value)}
            placeholder="Name (EN)"
            className="px-4 py-2 border rounded-md dark:bg-zinc-800"
            disabled={loading}
          />
          <input
            value={namePL}
            onChange={(e) => setNamePL(e.target.value)}
            placeholder="Nazwa (PL)"
            className="px-4 py-2 border rounded-md dark:bg-zinc-800"
            disabled={loading}
          />
          <button
            onClick={handleAdd}
            disabled={loading}
            className="bg-blue-600 text-white rounded-md px-4 py-2"
          >
            ➕ {locale === 'pl' ? 'Dodaj' : 'Add'}
          </button>
        </div>
      </div>

      {/* قائمة الفئات */}
      {categories.length === 0 ? (
        <p className="text-center text-zinc-400">
          {locale === 'pl' ? 'Brak kategorii.' : 'No categories yet.'}
        </p>
      ) : (
        <ul className="grid md:grid-cols-2 gap-6">
          {categories.map((c) => (
            <li
              key={c._id}
              className="bg-white dark:bg-zinc-800 border p-5 rounded-xl shadow flex justify-between items-center"
            >
              <div className="flex items-start gap-3">
                <FolderKanban className="w-5 h-5 mt-1 text-blue-500" />
                <div>
                  <p className="font-semibold">{c.nameEn}</p>
                  <p className="text-sm text-zinc-500">{c.namePl}</p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(c._id)}
                disabled={loading}
                className="text-red-500"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
