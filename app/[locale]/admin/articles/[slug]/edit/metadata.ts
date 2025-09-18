// E:\trifuzja-mix\app\[locale]\admin\articles\[slug]\edit\metadata.ts
import type { Metadata } from 'next';
import clientPromise from '@/types/mongodb';
import type { PageKey } from '@/types/core/article';

interface Params {
  locale: 'en' | 'pl';
  slug: string;
}

type MetaDoc = {
  slug: string;
  title?: Record<string, string>;
  page?: PageKey;
  status?: string;
};

export async function generateMetadata(
  { params }: { params: Params },
): Promise<Metadata> {
  const { slug, locale } = params;
  const loc: 'en' | 'pl' = locale === 'pl' ? 'pl' : 'en';

  try {
    const db = (await clientPromise).db();
    const coll = db.collection<MetaDoc>('articles');

    // fetch exactly what we need
    const doc = await coll.findOne(
      { slug },
      { projection: { slug: 1, title: 1, page: 1, status: 1 } },
    );

    const pickedTitle =
      (doc?.title && (doc.title[loc] || doc.title.en || Object.values(doc.title)[0])) ||
      slug;

    const baseTitle =
      loc === 'pl'
        ? `Edycja: ${pickedTitle} | Panel | Initiativa Autonoma`
        : `Edit: ${pickedTitle} | Admin | Initiativa Autonoma`;

    return {
      title: baseTitle,
      description:
        loc === 'pl'
          ? 'Panel edycji artykułu w Initiativa Autonoma.'
          : 'Article editing panel in Initiativa Autonoma.',
      robots: {
        index: false,
        follow: false,
      },
      alternates: {
        canonical: `/${loc}/admin/articles/${slug}/edit`,
      },
      openGraph: {
        title: baseTitle,
        description:
          loc === 'pl'
            ? 'Edycja artykułu (panel administratorski).'
            : 'Article edit (admin panel).',
        url: `/${loc}/admin/articles/${slug}/edit`,
        siteName: 'Initiativa Autonoma',
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
          ? 'Edycja artykułu | Panel | Initiativa Autonoma'
          : 'Edit Article | Admin | Initiativa Autonoma',
      robots: { index: false, follow: false },
    };
  }
}
