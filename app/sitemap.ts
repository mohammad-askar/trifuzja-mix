// app/sitemap.ts
import type { MetadataRoute } from 'next';
import clientPromise from '@/types/mongodb';

const SITE_URL =
  process.env.SITE_URL?.replace(/\/+$/, '') ??
  'https://initiativa-autonoma.com';

const LOCALES = ['en', 'pl'] as const;

type ArticleDoc = {
  slug: string;
  status?: 'draft' | 'published';
  updatedAt?: Date;
  createdAt?: Date;
};

function languagesFor(path: string): Record<string, string> {
  // ينعكس نفس المسار على اللغتين
  return LOCALES.reduce<Record<string, string>>((acc, loc) => {
    acc[loc] = `${SITE_URL}/${loc}${path}`;
    return acc;
  }, {});
}

function entry(
  path: string,
  opts?: { lastModified?: Date; changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency']; priority?: number }
): MetadataRoute.Sitemap[number] {
  return {
    // نعتبر النسخة المعيارية هي الإنجليزية
    url: `${SITE_URL}/en${path}`,
    lastModified: opts?.lastModified ?? new Date(),
    changeFrequency: opts?.changeFrequency ?? 'weekly',
    priority: opts?.priority ?? 0.7,
    alternates: {
      languages: languagesFor(path),
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const items: MetadataRoute.Sitemap = [];

  // صفحات ثابتة
  items.push(
    entry(''), // /en  (الصفحة الرئيسية)
    entry('/articles'),
    entry('/videos'),
    entry('/privacy')
  );

  // مقالات من قاعدة البيانات (اختياريًا إن توفرت)
  try {
    const db = (await clientPromise).db();
    const docs = (await db
      .collection<ArticleDoc>('articles')
      .find({
        $or: [{ status: 'published' }, { status: { $exists: false } }],
      })
      .project({ slug: 1, updatedAt: 1, createdAt: 1 })
      .toArray()) as ArticleDoc[];

    for (const doc of docs) {
      if (!doc?.slug) continue;
      const last =
        doc.updatedAt ?? doc.createdAt ?? new Date();
      items.push(entry(`/articles/${doc.slug}`, { lastModified: last, priority: 0.8 }));
    }
  } catch {
    // لو فشل الاتصال بقاعدة البيانات، نُعيد الصفحات الثابتة فقط بدون رمي أخطاء
  }

  return items;
}
