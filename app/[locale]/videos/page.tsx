// app/[locale]/videos/page.tsx
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import type { ObjectId } from 'mongodb';
import clientPromise from '@/types/mongodb';

import VideosClient, { Locale, VideoItem } from './VideosClient';
import CategoryChips from '@/app/components/CategoryChips';

/* ---------- Metadata ---------- */
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


interface CategoryDbDoc {
  _id: ObjectId;
  name: unknown; // może być string lub {en, pl}
}

interface CategoryUi {
  _id: string;
  name: string;
}

/* ---------- Helpers ---------- */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Ta sama logika co w /articles – wybieramy ładną nazwę PL. */
function normalizeNameToPolish(input: unknown): string {
  if (typeof input === 'string') return input.trim();

  if (isRecord(input)) {
    const pl = typeof input.pl === 'string' ? input.pl.trim() : '';
    if (pl) return pl;
    const en = typeof input.en === 'string' ? input.en.trim() : '';
    if (en) return en;

    const first = Object.values(input).find(
      (v): v is string => typeof v === 'string' && v.trim().length > 0,
    );
    return (first ?? '').trim();
  }

  return '';
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
  cats?: string[] | null;
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
  if (opts.cats && opts.cats.length) {
    for (const c of opts.cats) {
      qs.append('cat', c);
    }
  }

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
  searchParams?: Promise<{ pageNo?: string; limit?: string; cat?: string | string[] }>;
}) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};

  const pageNo = Number(sp.pageNo ?? '1');
  const limit = Number(sp.limit ?? '9');

  const catParam = sp.cat;
  const selectedCat: string[] = Array.isArray(catParam)
    ? catParam
    : catParam
    ? [catParam]
    : [];

  if (!Number.isFinite(pageNo) || pageNo <= 0) {
    return redirect(
      `/${locale}/videos?pageNo=1${
        sp.limit ? `&limit=${sp.limit}` : ''
      }${selectedCat.length ? `&cat=${selectedCat.join(',')}` : ''}`,
    );
  }
  if (!Number.isFinite(limit) || limit <= 0) {
    return redirect(
      `/${locale}/videos?pageNo=${pageNo}&limit=9${
        selectedCat.length ? `&cat=${selectedCat.join(',')}` : ''
      }`,
    );
  }

  // 1) categories (same as Articles page)
  const db = (await clientPromise).db();
  const rawCats = await db
    .collection<CategoryDbDoc>('categories')
    .aggregate([
      {
        $project: {
          name: 1,
          createdAt: 1,
          updatedAt: 1,
          effectiveTS: {
            $ifNull: [
              '$updatedAt',
              { $ifNull: ['$createdAt', { $toDate: '$_id' }] },
            ],
          },
        },
      },
      { $sort: { effectiveTS: -1, _id: -1 } },
    ])
    .toArray();

  const cats: CategoryUi[] = rawCats.map((d) => ({
    _id: d._id.toHexString(),
    name: normalizeNameToPolish(d.name),
  }));

  // 2) videos filtered by category
  const data = await fetchVideosServer({
    pageNo,
    limit,
    cats: selectedCat.length ? selectedCat : null,
  });
  if (!data) notFound();

  return (
    <main className="max-w-6xl mx-auto px-4 pt-12 pb-20">
      {/* ✅ same chip bar as /articles */}
      <CategoryChips categories={cats} selected={selectedCat} />

      <VideosClient
        locale={locale}
        initialPage={data.pageNo}
        pages={data.pages}
        limit={data.limit}
        total={data.total}
        initialItems={data.items}
        catsParam={selectedCat.length ? selectedCat : null}
      />
    </main>
  );
}
