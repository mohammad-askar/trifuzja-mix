// app/[locale]/layout.tsx
import type { ReactNode } from 'react';
import Header from '@/app/components/Header';
import { Footer } from '../components/Footer';

type Locale = 'en' | 'pl';

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>; // ✅ Promise in your Next 16 setup
}

function normalizeLocale(raw: unknown): Locale {
  return raw === 'pl' || raw === 'en' ? raw : 'en';
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale: raw } = await params; // ✅ unwrap Promise
  const locale = normalizeLocale(raw);

  return (
    <>
      <Header locale={locale} />
      <div className="h-1" aria-hidden />
      <main className="min-h-screen">{children}</main>
      <Footer locale={locale} />
    </>
  );
}
