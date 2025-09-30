// app/[locale]/layout.tsx
import Header from '@/app/components/Header';
import { Footer } from '../components/Footer';
import type { ReactNode } from 'react';

type Locale = 'en' | 'pl';

interface LocaleLayoutProps {
  children: ReactNode;
  // ملاحظة: في Next 15 params أصبحت Promise
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale: raw } = await params;           // ✅ ننتظر params
  const locale: Locale = raw === 'pl' ? 'pl' : 'en';

  return (
    <>
      <Header locale={locale} />
      <div className="h-1" aria-hidden />
      <main className="min-h-screen">{children}</main>
      <Footer locale={locale} />
    </>
  );
}
