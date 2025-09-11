//E:\trifuzja-mix\app\layout.tsx
import './globals.css';
import { Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import Providers from './providers';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TRIFUZJA Mix',
  description: 'Read articles in English and Polish',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // جلب الجلسة على الخادم
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* مرّر الجلسة للـ SessionProvider */}
        <Providers session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
