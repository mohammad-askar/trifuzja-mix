//E:\trifuzja-mix\app\[locale]\layout.tsx
import Header from '@/app/components/Header'
import { Footer } from '../components/Footer';
import type { ReactNode } from 'react';

interface LocaleLayoutProps {
  children: ReactNode;
  params: { locale: string };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const resolvedParams = await Promise.resolve(params);
  const locale = resolvedParams.locale === 'pl' ? 'pl' : 'en';

  return (
    <>
      <Header locale={locale} />
      {/* 👇 Spacer يمنع التداخل مع الهيدر الثابت */}
      <div className="h-15" aria-hidden />
      {/* لا تضف pt-20 هنا */}
      <main className="min-h-screen ">{children}</main>
      <Footer locale={locale} />
    </>
  );
}

