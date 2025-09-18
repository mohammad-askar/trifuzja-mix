// app/providers.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import type { ReactNode } from 'react';
import type { Session } from 'next-auth';

interface ProvidersProps {
  children: ReactNode;
  session: Session | null;
}

export default function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      {children}

      {/* 🔔 توستر عام للموقع – رجاءً احذف أي Toaster آخر داخل الصفحات */}
      <Toaster
        position="bottom-left"
        toastOptions={{
          // نمط افتراضي
          style: { color: '#fff' },

          // نجاح = أخضر
          success: {
            style: { background: '#16a34a' }, // green-600
            iconTheme: { primary: '#16a34a', secondary: '#fff' },
          },

          // خطأ = أحمر
          error: {
            style: { background: '#dc2626' }, // red-600
            iconTheme: { primary: '#dc2626', secondary: '#fff' },
          },

          // ملاحظات: لو بتستعمل toast.custom، تقدر تسيب ده
          // custom: {
          //   style: { background: '#f97316' }, // orange-500
          //   iconTheme: { primary: '#f97316', secondary: '#fff' },
          // },
        }}
      />
    </SessionProvider>
  );
}
