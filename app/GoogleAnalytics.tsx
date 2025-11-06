// app/GoogleAnalytics.tsx
'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getAnalyticsConsent } from '@/utils/consent';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID as string | undefined;
const GA_DEBUG = process.env.NEXT_PUBLIC_GA_DEBUG === 'true';

type ConsentEvent = CustomEvent<boolean>;

type GtagConfig = {
  send_page_view?: boolean;
  anonymize_ip?: boolean;
  [key: string]: unknown;
};

type Gtag = {
  (command: 'js', date: Date): void;
  (command: 'config', targetId: string, config?: GtagConfig): void;
  (command: 'consent', action: 'default' | 'update', params: Record<string, 'granted' | 'denied'>): void;
  (command: 'event', eventName: string, params?: Record<string, unknown>): void;
};

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: Gtag;
  }
}

interface Props {
  /** لسياسات CSP إن كنت تستخدم nonce على السكربتات */
  nonce?: string;
}

export default function GoogleAnalytics({ nonce }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [allowed, setAllowed] = useState<boolean>(false);
  const lastSentPathRef = useRef<string>('');

  // url الحالية (مسار + استعلامات)
  const pagePath = useMemo(() => {
    const q = searchParams?.toString();
    return q ? `${pathname}?${q}` : pathname || '/';
  }, [pathname, searchParams]);

  /** قراءة الموافقة أول مرة + الاشتراك في أي تغيير من البنر */
  useEffect(() => {
    setAllowed(getAnalyticsConsent());

    const handler = (e: Event) => {
      const granted = (e as ConsentEvent).detail;
      setAllowed(Boolean(granted));
      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('consent', 'update', {
          ad_storage: granted ? 'granted' : 'denied',
          analytics_storage: granted ? 'granted' : 'denied',
        });
      }
    };

    window.addEventListener('ia:analytics-consent', handler as EventListener);
    return () => window.removeEventListener('ia:analytics-consent', handler as EventListener);
  }, []);

  /** إرسال page_view كحدث عند تغيّر الروت (بعد الموافقة) */
  useEffect(() => {
    if (!GA_ID || !allowed || typeof window === 'undefined' || typeof window.gtag !== 'function') return;

    // منع التكرار إذا أبلغنا عن نفس المسار مرة أخرى (قد يحدث مع تحديثات سريعة)
    if (lastSentPathRef.current === pagePath) return;
    lastSentPathRef.current = pagePath;

    const href = typeof window !== 'undefined' ? window.location.href : pagePath;
    const title = typeof document !== 'undefined' ? document.title : undefined;

    window.gtag('event', 'page_view', {
      page_location: href,
      page_path: pagePath,
      page_title: title,
      // يسهّل الفحص في DebugView داخل GA4
      ...(GA_DEBUG ? { debug_mode: true } : {}),
    });
  }, [pagePath, allowed]);

  // لا نحمّل GA إطلاقًا قبل الموافقة أو في غياب المعرّف
  if (!GA_ID || !allowed) return null;

  return (
    <>
      <Script
        id="ga-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
        nonce={nonce}
      />
      <Script id="ga-init" strategy="afterInteractive" nonce={nonce}>
        {`
          // تهيئة DataLayer + دالة gtag (Stub) قبل تحميل الملف الخارجي
          window.dataLayer = window.dataLayer || [];
          function gtag(){ window.dataLayer.push(arguments); }
          window.gtag = gtag;

          // تفعيل Consent Mode بقيم آمنة افتراضيًا (لن نصل هنا أصلاً بدون موافقة، لكن للإتساق)
          gtag('consent', 'default', {
            'ad_storage': 'denied',
            'analytics_storage': 'granted'
          });

          // تهيئة GA4 بدون إرسال page_view تلقائيًا
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { send_page_view: false, anonymize_ip: true, ${(GA_DEBUG ? "debug_mode: true" : "")} });
        `}
      </Script>
    </>
  );
}
