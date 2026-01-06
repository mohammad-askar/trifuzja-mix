// app/layout.tsx
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";

import { auth } from "@/auth";

import Providers from "./providers";
import GoogleAnalytics from "./GoogleAnalytics";
import CookieBanner from "./components/CookieBanner";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#111827",
};

export const metadata: Metadata = {
  title: "MENSITIVA",
  description: "Read articles in Polish (and legacy English).",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/android-chrome-192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/android-chrome-512x512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
};

export default async function RootLayout(props: { children: ReactNode }) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google-adsense-account" content="ca-pub-5435364552811971" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5435364552811971"
          crossOrigin="anonymous"
        />
      </head>

      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <GoogleAnalytics />
        <Providers session={session}>{props.children}</Providers>
        <CookieBanner />
      </body>
    </html>
  );
}
