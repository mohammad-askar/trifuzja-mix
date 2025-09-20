// E:\trifuzja-mix\app\[locale]\videos\page.tsx
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { headers } from 'next/headers';
import { getYouTubeThumb } from '@/utils/youtube'; // ✅ استخدم الدوال الموحّدة

type Locale = 'en' | 'pl';

/* ---------- Metadata ---------- */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const titlePart = locale === 'pl' ? 'Wideo' : 'Videos';

  return {
    title: `${titlePart} | Initiativa Autonoma`,
    description:
      locale === 'pl'
        ? 'Przeglądaj najnowsze wideo w Initiativa Autonoma.'
        : 'Browse the latest videos on Initiativa Autonoma.',
    openGraph: {
      title: `${titlePart} | Initiativa Autonoma`,
      description:
        locale === 'pl'
          ? 'Przeglądaj najnowsze wideo w Initiativa Autonoma.'
          : 'Browse the latest videos on Initiativa Autonoma.',
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

/* ---------- Helper: fetch videos (/api/videos) ---------- */
async function fetchVideos(qs: string) {
  const base = await buildBaseUrlFromHeaders();
  const url = `${base}/api/videos${qs}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  return res.json() as Promise<{
    articles: Array<{
      _id?: string;
      slug: string;
      title: string;
      excerpt?: string;
      coverUrl?: string;
      videoUrl?: string;
      createdAt: string | Date;
      isVideoOnly?: boolean;
    }>;
    total: number;
    pageNo: number;
    limit: number;
    pages: number;
  }>;
}

function PageLink({
  locale,
  page,
  disabled,
  children,
}: {
  locale: Locale;
  page: number;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const href = `/${locale}/videos?pageNo=${page}`;
  if (disabled) {
    return (
      <span
        aria-disabled
        className="px-3 py-1 rounded border border-zinc-700 opacity-40 pointer-events-none"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="px-3 py-1 rounded border border-zinc-700 hover:bg-white/5"
    >
      {children}
    </Link>
  );
}

/* ---------- Empty state ---------- */
function EmptyState({ locale }: { locale: Locale }) {
  const title = locale === 'pl' ? 'Brak wideo' : 'No videos yet';
  const subtitle =
    locale === 'pl'
      ? 'Wróć wkrótce — szykujemy coś ciekawego.'
      : 'Check back soon — we’re preparing something new.';

  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-zinc-800 bg-gradient-to-b from-gray-900/90 to-gray-900/80 p-6 text-center shadow-lg">
      <svg aria-hidden viewBox="0 0 200 120" className="mx-auto mb-6 h-24 w-40 opacity-90">
        <defs>
          <linearGradient id="g" x1="0" x2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <rect x="20" y="20" width="160" height="80" rx="12" fill="url(#g)" opacity="0.15" />
        <rect x="45" y="40" width="110" height="60" rx="8" className="text-zinc-800" fill="currentColor" />
        <polygon points="85,55 120,70 85,85" fill="#60a5fa" />
      </svg>

      <h2 className="text-xl font-semibold tracking-tight text-gray-100">{title}</h2>
      <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>

      <div className="mt-6">
        <Link
          href={`/${locale}/articles`}
          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline underline-offset-4"
        >
          {locale === 'pl' ? 'Zobacz artykuły' : 'Browse articles'}
          <span aria-hidden>→</span>
        </Link>
      </div>

      <p className="mt-4 text-xs text-zinc-500">
        {locale === 'pl'
          ? 'Wideo pojawią się tutaj, gdy będą dostępne.'
          : 'Videos will appear here once they are available.'}
      </p>
    </section>
  );
}

/* ---------- Page ---------- */
export default async function VideosPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;

  const urlSp = new URLSearchParams();
  if (sp?.pageNo) urlSp.set('pageNo', String(sp.pageNo));
  if (sp?.limit) urlSp.set('limit', String(sp.limit));

  const qs = urlSp.toString();
  const data = await fetchVideos(qs ? `?${qs}` : '');
  if (!data) notFound();

  const { articles, pageNo, pages } = data;
  const items = (articles || []).filter((a) => a.videoUrl);

  return (
    <main className="max-w-6xl mx-auto px-4 pt-20 pb-20">
      {items.length === 0 ? (
        <EmptyState locale={locale} />
      ) : (
        <>
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => {
              const href = `/${locale}/articles/${a.slug}`;
              const ytThumb = a.videoUrl ? getYouTubeThumb(a.videoUrl) : null; // ✅ من utils
              const cover = ytThumb || a.coverUrl || '';

              return (
                <article
                  key={a._id ?? a.slug}
                  className="group relative rounded-xl border border-zinc-800 bg-gray-900/90 p-3 shadow-sm transition hover:shadow-lg hover:border-zinc-700 focus-within:ring-2 focus-within:ring-blue-500/40"
                >
                  <Link
                    href={href}
                    className="absolute inset-0 z-10 rounded-xl"
                    aria-label={a.title}
                    tabIndex={0}
                  />

                  <div className="relative mb-3 overflow-hidden rounded-lg ring-1 ring-inset ring-zinc-800">
                    <div className="relative aspect-video">
                      {cover ? (
                        <Image
                          src={cover}
                          alt={a.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition duration-300 group-hover:scale-[1.02]"
                          priority={false}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
                          {locale === 'pl' ? 'Brak podglądu' : 'No preview'}
                        </div>
                      )}

                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="rounded-full bg-black/40 p-3 backdrop-blur-md ring-1 ring-white/20 transition group-hover:bg-black/50">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <circle cx="12" cy="12" r="11" stroke="white" strokeOpacity="0.25" />
                            <polygon points="10,8 17,12 10,16" fill="white" />
                          </svg>
                        </div>
                      </div>

                      <span
                        className="absolute left-2 top-2 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow ring-1 ring-white/15"
                        aria-label={locale === 'pl' ? 'Wideo' : 'Video'}
                      >
                        {locale === 'pl' ? 'Wideo' : 'Video'}
                      </span>
                    </div>
                  </div>

                  <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-gray-100">
                    {a.title}
                  </h2>
                  {a.excerpt && (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{a.excerpt}</p>
                  )}

                  <div className="mt-3">
                    <Link
                      href={href}
                      className="relative z-20 inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                    >
                      {locale === 'pl' ? 'Otwórz' : 'Open'}
                      <span aria-hidden>↗</span>
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>

          {pages > 1 && (
            <div className="mt-8 flex items-center gap-2">
              <PageLink locale={locale} page={pageNo - 1} disabled={pageNo <= 1}>
                {locale === 'pl' ? 'Poprzednia' : 'Prev'}
              </PageLink>
              <span className="text-sm text-zinc-400">
                {pageNo} / {pages}
              </span>
              <PageLink locale={locale} page={pageNo + 1} disabled={pageNo >= pages}>
                {locale === 'pl' ? 'Następna' : 'Next'}
              </PageLink>
            </div>
          )}
        </>
      )}
    </main>
  );
}
