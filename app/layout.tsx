// app/layout.tsx
import './globals.css';
import { Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import Providers from './providers';
import GoogleAnalytics from './GoogleAnalytics';        // يتفعّل فقط بعد الموافقة (داخل المكوّن)
import CookieBanner from './components/CookieBanner';   // شريط الموافقة

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Initiativa Autonoma',
  description: 'Read articles in Polish (and legacy English).',
  alternates: {
    languages: {
      en: '/en',
      pl: '/pl',
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/site.webmanifest',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* GA لن يُحمّل إلا بعد الموافقة داخل المكوّن */}
        <GoogleAnalytics />
        <Providers session={session}>{children}</Providers>
        {/* شريط الموافقة في أسفل الصفحة */}
        <CookieBanner />
      </body>
    </html>
  );
}
