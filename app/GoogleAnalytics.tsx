//E:\trifuzja-mix\app\GoogleAnalytics.tsx
'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAnalyticsConsent } from '@/utils/consent';

const GA_ID: string | undefined = process.env.NEXT_PUBLIC_GA_ID;

type Gtag = {
  (command: 'js', date: Date): void;
  (command: 'config', targetId: string, config?: GtagConfig): void;
  (command: 'consent', action: 'default' | 'update', params: Record<string, 'granted' | 'denied'>): void;
  (command: 'event', eventName: string, params?: Record<string, unknown>): void;
};

type GtagConfig = {
  page_path?: string;
  send_page_view?: boolean;
  anonymize_ip?: boolean;
  [key: string]: unknown;
};

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: Gtag;
  }
}

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [allowed, setAllowed] = useState<boolean>(false);

  // قراءة الموافقة عند التحميل
  useEffect(() => {
    setAllowed(getAnalyticsConsent());
    // الاستماع لأي تغيير موافقة يأتي من CookieBanner
    const handler = (e: Event) => {
      const granted = (e as CustomEvent<boolean>).detail;
      setAllowed(Boolean(granted));
    };
    window.addEventListener('ia:analytics-consent', handler as EventListener);
    return () => window.removeEventListener('ia:analytics-consent', handler as EventListener);
  }, []);

  // إرسال page_view عند تغير المسار إذا كان مسموحًا
  useEffect(() => {
    if (!GA_ID || !allowed || typeof window === 'undefined' || typeof window.gtag !== 'function') return;
    const q = searchParams?.toString();
    const page_path = q ? `${pathname}?${q}` : pathname;
    window.gtag('config', GA_ID, { page_path, anonymize_ip: true });
  }, [pathname, searchParams, allowed]);

  // لا نحمّل GA إلا إذا مُنحت الموافقة
  if (!GA_ID || !allowed) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){ window.dataLayer.push(arguments); }
          window.gtag = gtag;
          // وضع Consent Mode (أساسي للتحليلات)
          gtag('consent', 'default', {
            'ad_storage': 'denied',
            'analytics_storage': 'granted'
          });
          gtag('js', new Date());
          // لا نرسل page_view تلقائيًا لتفادي التكرار
          gtag('config', '${GA_ID}', { send_page_view: false, anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
