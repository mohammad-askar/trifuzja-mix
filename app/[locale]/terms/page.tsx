'use client';

import { useParams } from 'next/navigation';

type Locale = 'en' | 'pl';

const content: Record<Locale, { title: string; body: string }> = {
  en: {
    title: 'Terms & Conditions',
    body: `By using Trifuzja Mix, you agree to our basic terms of use.

This page will be expanded in the future with detailed legal information.`,
  },
  pl: {
    title: 'Regulamin',
    body: `Korzystając z Trifuzja Mix, akceptujesz nasze podstawowe warunki korzystania z serwisu.

Ta strona zostanie w przyszłości uzupełniona o szczegółowe informacje prawne.`,
  },
};

export default function TermsPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) ?? 'en';
  const t = content[locale];

  return (
    <main className="min-h-[calc(100vh-160px)] px-4 pt-6 flex items-center justify-center">
      <div className="max-w-3xl bg-white rounded-xl shadow-md p-8 text-zinc-800 w-full">
        <h1 className="text-3xl font-bold mb-4">📜 {t.title}</h1>
        <p className="text-lg leading-relaxed whitespace-pre-line">{t.body}</p>
      </div>
    </main>
  );
}
