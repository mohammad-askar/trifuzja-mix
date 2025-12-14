'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomeRedirect() {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(true);

  useEffect(() => {
    const preferredLocale = localStorage.getItem('preferredLocale');

    if (preferredLocale === 'pl' || preferredLocale === 'en') {
      router.push(`/${preferredLocale}`);
    } else {
      router.push('/pl');
    }

    setRedirecting(false);
  }, [router]);

  return redirecting ? (
    <div className="h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50">
      <div className="rounded-2xl bg-white/70 backdrop-blur px-10 py-8 shadow-sm ring-1 ring-black/5">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-gray-600"
          aria-label="Ładowanie"
          role="status"
        />
      </div>
    </div>
  ) : null;
}
