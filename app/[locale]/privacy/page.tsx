'use client';

import { useParams } from 'next/navigation';

type Locale = 'en' | 'pl';

const content: Record<Locale, { title: string; body: string }> = {
  en: {
    title: 'Privacy Policy',
    body: `We value your privacy. We do not collect personal data unless explicitly provided by you.

This page will be updated with our full privacy policy as we grow.`,
  },
  pl: {
    title: 'Polityka Prywatności',
    body: `Szanujemy Twoją prywatność. Nie zbieramy danych osobowych, chyba że zostaną one dobrowolnie podane.

Ta strona zostanie zaktualizowana o pełną politykę prywatności w miarę naszego rozwoju.`,
  },
};

export default function PrivacyPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) ?? 'en';
  const t = content[locale];

  return (
    <main className="min-h-[calc(100vh-160px)] px-4 pt-6 flex items-center justify-center">
      <div className="max-w-3xl bg-white rounded-xl shadow-md p-8 text-zinc-800 w-full">
        <h1 className="text-3xl font-bold mb-4">🔒 {t.title}</h1>
        <p className="text-lg leading-relaxed whitespace-pre-line">{t.body}</p>
      </div>
    </main>
  );
}
