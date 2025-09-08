'use client';

import { useParams } from 'next/navigation';

type Locale = 'en' | 'pl';

const content: Record<Locale, { title: string; body: string }> = {
  en: {
    title: 'About Us',
    body: `Trifuzja Mix is a content-driven platform created to educate, inspire, and engage.
We write articles in English and Polish to connect with a broad community.

Whether you're here to learn something new or simply enjoy reading, you're in the right place. Welcome aboard!`,
  },
  pl: {
    title: 'O nas',
    body: `Trifuzja Mix to platforma z treściami stworzona, aby edukować, inspirować i angażować.
Piszemy artykuły po angielsku i po polsku, aby dotrzeć do szerszej społeczności.

Niezależnie od tego, czy chcesz się czegoś nauczyć, czy po prostu lubisz czytać – jesteś we właściwym miejscu!`,
  },
};

export default function AboutPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) ?? 'en';
  const t = content[locale];

  return (
    <main className="min-h-screen py-24 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md p-8 text-zinc-800">
        <h1 className="text-3xl font-bold mb-6">👋 {t.title}</h1>
        <p className="text-lg leading-relaxed whitespace-pre-line">{t.body}</p>
      </div>
    </main>
  );
}
