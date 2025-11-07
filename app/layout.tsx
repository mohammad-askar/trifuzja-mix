// app/layout.tsx
import './globals.css';
import { Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import Providers from './providers';
import GoogleAnalytics from './GoogleAnalytics';
import CookieBanner from './components/CookieBanner';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

// ✅ themeColor belongs to `viewport`, not `metadata`
export const viewport: Viewport = {
  // One value (your dark brand color)
  themeColor: '#111827',
  // Or if you want light/dark handling, use this instead:
  // themeColor: [
  //   { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  //   { media: '(prefers-color-scheme: dark)', color: '#111827' },
  // ],
};

export const metadata: Metadata = {
  title: 'MENSITIVA',
  description: 'Read articles in Polish (and legacy English).',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/android-chrome-192x192.png', type: 'image/png', sizes: '192x192' },
      { url: '/android-chrome-512x512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/site.webmanifest',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* AdSense site verification */}
        <meta name="google-adsense-account" content="ca-pub-5435364552811971" />

        {/* AdSense loader – rendered in raw HTML, not deferred */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5435364552811971"
          crossOrigin="anonymous"
        ></script>
      </head>

      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <GoogleAnalytics />
        <Providers session={session}>{children}</Providers>
        <CookieBanner />
      </body>
    </html>
  );
}
