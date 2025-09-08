// app/[locale]/articles/[slug]/page.tsx
import { notFound } from 'next/navigation';
import clientPromise from '@/types/mongodb';
import type { Metadata } from 'next';
import type { PageKey } from '@/types/constants/pages';
import Image from 'next/image';
import { Facebook, Twitter, Linkedin } from 'lucide-react';

type Locale = 'en' | 'pl';
type Status = 'draft' | 'published';

interface ArticleDoc {
  slug: string;
  page: PageKey;
  categoryId: string;
  title: Record<string, string>;
  excerpt?: Record<string, string>;
  content?: Record<string, string>;
  coverUrl?: string;
  videoUrl?: string;
  status: Status;
  createdAt: Date;
  updatedAt: Date;
  readingTime?: string;
}

/* ---------- helpers ---------- */
function pick(field: Record<string, string> | undefined, locale: Locale) {
  return field?.[locale] ?? field?.en ?? Object.values(field ?? {})[0] ?? '';
}

function resolveSrc(src?: string) {
  if (!src) return '';
  if (/^https?:\/\//.test(src)) return src; // رابط كامل
  return src.startsWith('/') ? src : `/${src}`; // مسار جذري
}

async function fetchArticle(slug: string) {
  const db = (await clientPromise).db();
  return db
    .collection<ArticleDoc>('articles')
    .findOne({ slug, status: 'published' });
}

/* ---------- Metadata ---------- */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const art = await fetchArticle(slug);
  if (!art) {
    return { title: 'Not Found | Trifuzja Mix', description: 'Article not found' };
  }

  const title = pick(art.title, locale);
  const excerpt = pick(art.excerpt, locale);
  const cover = art.coverUrl;

  return {
    title: `${title} | Trifuzja Mix`,
    description: excerpt.slice(0, 150),
    openGraph: {
      title,
      description: excerpt.slice(0, 200),
      images: cover ? [{ url: cover }] : undefined,
      type: 'article',
    },
    alternates: { canonical: `/${locale}/articles/${slug}` },
  };
}

/* ---------- Page ---------- */
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const art = await fetchArticle(slug);
  if (!art) notFound();

  /* نصوص */
  const title = pick(art.title, locale);
  const excerpt = pick(art.excerpt, locale);
  const body = pick(art.content, locale);

  const dateStr = new Date(art.createdAt).toLocaleDateString(
    locale === 'pl' ? 'pl-PL' : 'en-GB',
    { year: 'numeric', month: 'long', day: 'numeric' },
  );

  /* ---------- روابط المشاركة ---------- */
  const pageUrl = encodeURIComponent(
    `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/${locale}/articles/${slug}`,
  );

  const SHARE_ICONS = [
    {
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${pageUrl}`,
      label: 'Twitter',
      color: 'hover:bg-blue-500/20 text-blue-500',
    },
    {
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`,
      label: 'Facebook',
      color: 'hover:bg-[#3b5998]/20 text-[#3b5998]',
    },
    {
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${pageUrl}`,
      label: 'LinkedIn',
      color: 'hover:bg-[#0a66c2]/20 text-[#0a66c2]',
    },
  ] as const;

  /* ---------- JSX ---------- */
  return (
    <article className="relative max-w-3xl mx-auto px-4 md:px-6 py-2">
      {/* خلفية متدرجة خفيفة */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-blue-50/60 via-transparent to-transparent dark:from-zinc-800/60" />

      {/* شريط المشاركة */}
{/* شريط مشاركة عمودي – أيقونات دائرية صغيرة */}




      {/* بطاقة المقال */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden ring-1 ring-gray-100 dark:ring-zinc-800 animate-fade-in">
        {/* غلاف */}
        {art.coverUrl && (
          <div className="relative w-full h-60 md:h-80 overflow-hidden group">
            <Image
              src={resolveSrc(art.coverUrl)}
              alt={title}
              fill
              priority
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        )}

        {/* محتوى */}
        <div className="px-6 md:px-10 py-10 prose dark:prose-invert max-w-none">
          <header className="mb-8">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
              {title}
            </h1>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
              <time>{dateStr}</time>
              <span className="uppercase font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded">
                {art.page}
              </span>
              {art.readingTime && (
                <span className="italic">{art.readingTime}</span>
              )}
            </div>
          </header>

          {excerpt && (
            <blockquote className="border-l-4 border-blue-500 pl-5 italic text-gray-700 dark:text-gray-300 bg-blue-50/40 dark:bg-blue-900/40 p-4 rounded-md shadow-sm">
              {excerpt}
            </blockquote>
          )}

          {/* فيديو */}
          {art.videoUrl && (
            <div className="my-10 aspect-video rounded-lg overflow-hidden shadow-md ring-1 ring-gray-100 dark:ring-zinc-800">
              {/(youtube\.com|youtu\.be)/.test(art.videoUrl) ? (
                <iframe
                  src={art.videoUrl.replace('watch?v=', 'embed/')}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Embedded Video"
                />
              ) : (
                <video
                  controls
                  src={art.videoUrl}
                  className="w-full h-full object-cover"
                  preload="metadata"
                />
              )}
            </div>
          )}

          {/*本文*/}
          {body ? (
            <section
              dangerouslySetInnerHTML={{ __html: body }}
              className="prose-headings:scroll-mt-24"
            />
          ) : (
            <p className="mt-8 italic text-center text-gray-500 dark:text-gray-400">
              No content.
            </p>
          )}
        </div>
      </div>
{/* شريط مشاركة سفلي */}
<footer className="max-w-3xl mx-auto mt-12  mb-4 flex justify-center gap-6">
  {SHARE_ICONS.map(({ icon: Icon, href, label, color }) => (
    <a
      key={label}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Share on ${label}`}
      className={`w-9 h-9 flex items-center justify-center rounded-full
                  bg-gray-200/70 dark:bg-zinc-700/70 backdrop-blur
                  hover:scale-110 transition-transform ${color}`}
    >
      <Icon className="size-4" />
    </a>
  ))}
</footer>


    </article>
    
  );
}
