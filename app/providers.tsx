//E:\trifuzja-mix\app\providers.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import type { ReactNode } from 'react';
import type { Session } from 'next-auth';

export default function Providers({
  children,
  session,
}: {
  children: ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      {children}

      {/* 🔔 توستر عام للموقع */}
      {/* 🔔 توستر عام للموقع – ألوان مميّزة لكل حالة */}
<Toaster
  position="bottom-left"
  toastOptions={{
    // نمط افتراضي (يُطبَّق على كل الأنواع إذا لم يُكتب style مخصّص)
    style: { color: '#fff' },

    /* نجاح = أخضر */
    success: {
      style:       { background: '#16a34a' },           // Tailwind green‑600
      iconTheme:   { primary: '#16a34a', secondary: '#fff' },
    },

    /* خطأ = أحمر */
    error: {
      style:       { background: '#dc2626' },           // Tailwind red‑600
      iconTheme:   { primary: '#dc2626', secondary: '#fff' },
    },

    /* تحذير = برتقالي (toast.custom) */
    custom: {
      style:       { background: '#f97316' },           // Tailwind orange‑500
      iconTheme:   { primary: '#f97316', secondary: '#fff' },
    },
  }}
/>

    </SessionProvider>
  );
}
