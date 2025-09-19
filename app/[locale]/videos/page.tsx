import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';

type Locale = 'en' | 'pl';

/* ---------- Metadata ---------- */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === 'pl' ? 'Wideo' : 'Videos' };
}

/* ---------- Helper: absolute base URL ---------- */
async function buildBaseUrlFromHeaders(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}

/* ---------- Helper: fetch videos ---------- */
async function fetchVideos(qs: string) {
  const base = await buildBaseUrlFromHeaders();
  const res = await fetch(`${base}/api/articles?videoOnly=1${qs}`, {
    next: { revalidate: 60 },
  });
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

/* ---------- Helpers ---------- */
function toYouTubeEmbed(url: string): string {
  try {
    const u = new URL(url);
    if (u.host.includes('youtu.be')) return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.host.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
      const seg = u.pathname.split('/').filter(Boolean);
      if (seg[0] === 'shorts' && seg[1]) return `https://www.youtube.com/embed/${seg[1]}`;
      if (seg[0] === 'embed'  && seg[1]) return `https://www.youtube.com/embed/${seg[1]}`;
    }
  } catch {}
  return url;
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
  const base = `/${locale}/videos`;
  const href = `${base}?pageNo=${page}`;
  return (
    <a
      aria-disabled={disabled}
      href={disabled ? undefined : href}
      className={`px-3 py-1 rounded border border-zinc-700 ${
        disabled ? 'opacity-40 pointer-events-none' : 'hover:bg-white/5'
      }`}
    >
      {children}
    </a>
  );
}

/* ---------- حالة فارغة (بدون زر إضافة) ---------- */
function EmptyState({ locale }: { locale: Locale }) {
  const title = locale === 'pl' ? 'Brak wideo' : 'No videos yet';
  const subtitle =
    locale === 'pl'
      ? 'Wróć wkrótce — szykujemy coś ciekawego.'
      : 'Check back soon — we’re preparing something new.';

  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-zinc-800 bg-gradient-to-b from-gray-900/90 to-gray-900/80 p-4 text-center shadow-lg">
      {/* شكل أيقونة بسيط */}
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

      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>

      {/* رابط نصّي فقط بنفس ألوان الهيدر */}
      <div className="mt-6">
        <Link
          href={`/${locale}/articles`}
          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline"
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
  if (sp?.limit)  urlSp.set('limit', String(sp.limit));

  const data = await fetchVideos(urlSp.toString() ? `&${urlSp.toString()}` : '');
  if (!data) notFound();

  const { articles, pageNo, pages } = data;

  return (
    <main className="max-w-6xl mx-auto px-4 pt-24 pb-20">
      <h1 className="text-3xl font-bold mb-6">
        {locale === 'pl' ? 'Wideo' : 'Videos'}
      </h1>

      {/* حالة فارغة فقط */}
      {articles.length === 0 ? (
        <EmptyState locale={locale} />
      ) : (
        <>
          {/* شبكة الفيديوهات */}
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <article
                key={a.slug}
                className="group rounded-xl border border-zinc-800 bg-gray-900/90 p-3 shadow-sm transition hover:shadow-lg hover:border-zinc-700"
              >
                <div className="relative mb-3 overflow-hidden rounded-lg ring-1 ring-inset ring-zinc-800">
                  {a.videoUrl ? (
                    <div className="aspect-video">
                      <iframe
                        className="h-full w-full"
                        src={toYouTubeEmbed(a.videoUrl)}
                        title={a.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>
                  ) : a.coverUrl ? (
                    <div className="relative aspect-video">
                      <Image
                        src={a.coverUrl}
                        alt={a.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition duration-300 group-hover:scale-[1.02]"
                        priority={false}
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-video items-center justify-center text-sm text-zinc-500">
                      {locale === 'pl' ? 'Brak podglądu' : 'No preview'}
                    </div>
                  )}

                  <span className="absolute left-2 top-2 rounded-full bg-blue-600/90 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                    {locale === 'pl' ? 'Wideo' : 'Video'}
                  </span>
                </div>

                <h2 className="line-clamp-2 text-lg font-semibold leading-snug">
                  {a.title}
                </h2>
                {a.excerpt && (
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{a.excerpt}</p>
                )}

                <div className="mt-3">
                  <Link
                    href={`/${locale}/articles/${a.slug}`}
                    className="inline-flex rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-200 hover:bg-white/5"
                  >
                    {locale === 'pl' ? 'Otwórz' : 'Open'}
                  </Link>
                </div>
              </article>
            ))}
          </section>

          {/* صفحات */}
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
