//E:\trifuzja-mix\app\components\CookieBanner.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getAnalyticsConsent, setAnalyticsConsent } from '@/utils/consent';

type Locale = 'en' | 'pl';

const TEXTS: Record<Locale, {
  line: string;
  privacy: string;
  accept: string;
  decline: string;
}> = {
  en: {
    line: 'We use analytics cookies to improve our service. Google Analytics is enabled only after your consent.',
    privacy: 'Privacy Policy',
    accept: 'Accept',
    decline: 'Decline',
  },
  pl: {
    line: 'Używamy plików cookie analitycznych, aby ulepszać serwis. Google Analytics uruchamia się dopiero po wyrażeniu zgody.',
    privacy: 'Polityka prywatności',
    accept: 'Akceptuję',
    decline: 'Odrzucam',
  },
};

export default function CookieBanner() {
  const [visible, setVisible] = useState<boolean>(false);
  const pathname = usePathname();

  // استنتاج اللغة من أول جزء في المسار
  const locale: Locale = useMemo(() => {
    const first = (pathname ?? '/').split('/').filter(Boolean)[0];
    return first === 'pl' ? 'pl' : 'en';
  }, [pathname]);

  const t = TEXTS[locale];

  useEffect(() => {
    // إظهار البانر فقط إذا لا توجد موافقة سابقة
    setVisible(!getAnalyticsConsent());
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-gray-900 text-white">
      <div className="mx-auto max-w-4xl p-4 flex flex-col md:flex-row md:items-center gap-3">
        <p className="text-sm leading-5">
          {t.line}{' '}
          <Link href={`/${locale}/privacy`} className="underline">
            {t.privacy}
          </Link>
          .
        </p>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => { setAnalyticsConsent(false); setVisible(false); }}
            className="rounded-md border border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-800"
          >
            {t.decline}
          </button>
          <button
            onClick={() => { setAnalyticsConsent(true); setVisible(false); }}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm hover:bg-blue-700"
          >
            {t.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
