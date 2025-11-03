// E:\trifuzja-mix\app\[locale]\admin\articles\[slug]\edit\metadata.ts
import type { Metadata } from 'next';
import clientPromise from '@/types/mongodb';

type Locale = 'en' | 'pl';

interface Params {
  locale: Locale;
  slug: string;
}

type MetaDoc = {
  slug: string;
  title?: Record<string, string>;
};

/** Pick localized title safely. */
function pickTitle(title: MetaDoc['title'], loc: Locale, fallback: string): string {
  if (!title) return fallback;
  return (
    (typeof title[loc] === 'string' && title[loc]) ||
    (typeof title.en === 'string' && title.en) ||
    (Object.values(title).find((v) => typeof v === 'string' && v.trim()) as string | undefined) ||
    fallback
  );
}

export async function generateMetadata(
  { params }: { params: Params },
): Promise<Metadata> {
  const { slug, locale } = params;
  const loc: Locale = locale === 'pl' ? 'pl' : 'en';

  try {
    const db = (await clientPromise).db();
    const coll = db.collection<MetaDoc>('articles');

    // Fetch only what we need
    const doc = await coll.findOne(
      { slug },
      { projection: { slug: 1, title: 1 } },
    );

    const pickedTitle = pickTitle(doc?.title, loc, slug);

    const baseTitle =
      loc === 'pl'
        ? `Edycja: ${pickedTitle} | Panel | MENSITIVA`
        : `Edit: ${pickedTitle} | Admin | MENSITIVA`;

    const canonical = `/${loc}/admin/articles/${slug}/edit`;

    return {
      title: baseTitle,
      description:
        loc === 'pl'
          ? 'Panel edycji artykułu w MENSITIVA.'
          : 'Article editing panel in MENSITIVA.',
      robots: { index: false, follow: false },
      alternates: { canonical },
      openGraph: {
        title: baseTitle,
        description:
          loc === 'pl'
            ? 'Edycja artykułu (panel administratorski).'
            : 'Article edit (admin panel).',
        url: canonical,
        siteName: 'MENSITIVA',
        type: 'website',
      },
      twitter: {
        card: 'summary',
        title: baseTitle,
        description:
          loc === 'pl'
            ? 'Edycja artykułu w panelu.'
            : 'Editing article in admin panel.',
      },
    };
  } catch {
    return {
      title:
        locale === 'pl'
          ? 'Edycja artykułu | Panel | MENSITIVA'
          : 'Edit Article | Admin | MENSITIVA',
      robots: { index: false, follow: false },
    };
  }
}
