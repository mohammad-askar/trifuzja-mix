// E:\trifuzja-mix\app\[locale]\videos\page.tsx
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import VideosClient, { Locale, VideoItem } from './VideosClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const titlePart = locale === 'pl' ? 'Wideo' : 'Videos';

  return {
    title: `${titlePart} | MENSITIVA`,
    description:
      locale === 'pl'
        ? 'Przeglądaj najnowsze wideo w MENSITIVA.'
        : 'Browse the latest videos on MENSITIVA.',
    openGraph: {
      title: `${titlePart} | MENSITIVA`,
      description:
        locale === 'pl'
          ? 'Przeglądaj najnowsze wideo w MENSITIVA.'
          : 'Browse the latest videos on MENSITIVA.',
    },
    alternates: {
      languages: {
        en: '/en/videos',
        pl: '/pl/videos',
      },
    },
  };
}

/* ---------- Build absolute base URL from request headers ---------- */
async function buildBaseUrlFromHeaders(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}

/* ---------- Fetch one page from the API (server) ---------- */
async function fetchVideosServer(opts: {
  pageNo: number;
  limit: number;
}): Promise<{
  items: VideoItem[];
  total: number;
  pageNo: number;
  pages: number;
  limit: number;
} | null> {
  const base = await buildBaseUrlFromHeaders();
  const qs = new URLSearchParams();
  if (opts.pageNo) qs.set('pageNo', String(opts.pageNo));
  if (opts.limit) qs.set('limit', String(opts.limit));

  const res = await fetch(`${base}/api/videos?${qs.toString()}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    articles: VideoItem[];
    total: number;
    pageNo: number;
    limit: number;
    pages: number;
  };

  // نعرض فقط العناصر التي لديها videoUrl
  const filtered = (data.articles || []).filter((a) => !!a.videoUrl);

  return {
    items: filtered,
    total: data.total,
    pageNo: data.pageNo,
    pages: data.pages,
    limit: data.limit,
  };
}

/* ---------- Page (Server) ---------- */
export default async function VideosPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{ pageNo?: string; limit?: string }>;
}) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};

  const pageNo = Number(sp.pageNo ?? '1');
  const limit = Number(sp.limit ?? '9');

  // حماية من قيم غير صحيحة في URL
  if (!Number.isFinite(pageNo) || pageNo <= 0) {
    return redirect(`/${locale}/videos?pageNo=1${sp.limit ? `&limit=${sp.limit}` : ''}`);
  }
  if (!Number.isFinite(limit) || limit <= 0) {
    return redirect(`/${locale}/videos?pageNo=${pageNo}&limit=9`);
  }

  const data = await fetchVideosServer({ pageNo, limit });
  if (!data) notFound();

  return (
    <main className="max-w-6xl mx-auto px-4 pt-20 pb-20">
      <VideosClient
        locale={locale}
        initialPage={data.pageNo}
        pages={data.pages}
        limit={data.limit}
        total={data.total}
        initialItems={data.items}
      />
    </main>
  );
}
