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
    <div className="h-screen flex items-center justify-center text-gray-500">
      يتم التوجيه إلى اللغة المفضلة...
    </div>
  ) : null;
}
