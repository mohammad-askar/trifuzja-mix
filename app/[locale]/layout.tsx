// app/[locale]/layout.tsx
import Header from '@/app/components/Header';
import { Footer } from '../components/Footer';
import type { ReactNode } from 'react';

type Locale = 'en' | 'pl';

interface LocaleLayoutProps {
  children: ReactNode;
  params: { locale: string };
}

export default function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const raw = typeof params?.locale === 'string' ? params.locale : 'en';
  const locale: Locale = raw === 'pl' ? 'pl' : 'en';

  return (
    <>
      <Header locale={locale} />
      {/* Spacer لمنع تداخل الهيدر الثابت */}
      <div className="h-1" aria-hidden />
      <main className="min-h-screen">{children}</main>
      <Footer locale={locale} />
    </>
  );
}
