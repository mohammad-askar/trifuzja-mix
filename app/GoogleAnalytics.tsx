'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

const GA_ID: string | undefined = process.env.NEXT_PUBLIC_GA_ID;

type Gtag = {
  (command: 'js', date: Date): void;
  (command: 'config', targetId: string, config?: GtagConfig): void;
  (command: 'event', eventName: string, params?: GtagEventParams): void;
};

type GtagConfig = {
  page_path?: string;
  send_page_view?: boolean;      // ← سنعطّله في التهيئة الأولى
  anonymize_ip?: boolean;
  allow_google_signals?: boolean;
  [key: string]: unknown;
};

type GtagEventParams = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: Gtag;
  }
}

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // إرسال page_view يدويًا عند كل تغيير للمسار (وأيضًا على التحميل الأول)
  useEffect(() => {
    if (!GA_ID || typeof window === 'undefined' || typeof window.gtag !== 'function') return;
    const q = searchParams?.toString();
    const page_path = q ? `${pathname}?${q}` : pathname;
    window.gtag('config', GA_ID, { page_path });
  }, [pathname, searchParams]);

  if (!GA_ID) return null;

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
          gtag('js', new Date());
          // لا ترسل page_view تلقائيًا لتفادي التكرار
          gtag('config', '${GA_ID}', { send_page_view: false });
        `}
      </Script>
    </>
  );
}
