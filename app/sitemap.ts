// app/sitemap.ts
import type { MetadataRoute } from 'next'
import clientPromise from '@/types/mongodb'

const SITE_URL: string =
  (process.env.SITE_URL?.replace(/\/+$/, '') || 'https://initiativa-autonoma.com')

const LOCALES = ['en', 'pl'] as const
type Locale = typeof LOCALES[number]

type ArticleDoc = {
  slug: string
  updatedAt?: Date
  createdAt?: Date
}

/** يضمن أن المسار يبدأ بشرطة مائلة واحدة فقط */
function normalizePath(path: string): string {
  if (path === '' || path === '/') return ''
  return path.startsWith('/') ? path : `/${path}`
}

/** hreflang لكل صفحة */
function languagesFor(path: string): Record<Locale, string> {
  const clean = normalizePath(path)
  return LOCALES.reduce<Record<Locale, string>>((acc, loc) => {
    acc[loc] = `${SITE_URL}/${loc}${clean}`
    return acc
  }, {} as Record<Locale, string>)
}

/** عنصر Sitemap جاهز مع بدائل اللغات */
function entry(
  path: string,
  opts?: {
    lastModified?: Date
    changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency']
    priority?: number
  }
): MetadataRoute.Sitemap[number] {
  const clean = normalizePath(path)
  return {
    // اعتبر الإنجليزية الكانونيكال
    url: `${SITE_URL}/en${clean}`,
    lastModified: opts?.lastModified ?? new Date(),
    changeFrequency: opts?.changeFrequency ?? 'weekly',
    priority: opts?.priority ?? 0.7,
    alternates: {
      languages: languagesFor(clean),
    },
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const items: MetadataRoute.Sitemap = []

  // صفحات ثابتة
  items.push(
    entry(''),            // /en
    entry('/articles'),
    entry('/videos'),
    entry('/privacy')
  )

  // مقالات من قاعدة البيانات (بدون أي اعتماد على draft/published)
  try {
    const db = (await clientPromise).db()
    const docs = await db
      .collection<ArticleDoc>('articles')
      .find({}, { projection: { slug: 1, updatedAt: 1, createdAt: 1 } })
      .toArray()

    for (const doc of docs) {
      // نتأكد من وجود slug فقط
      if (!doc.slug) continue
      const last: Date = doc.updatedAt ?? doc.createdAt ?? new Date()
      items.push(
        entry(`/articles/${doc.slug}`, {
          lastModified: last,
          priority: 0.8,
        })
      )
    }
  } catch {
    // إذا فشل الاتصال بقاعدة البيانات نُعيد الصفحات الثابتة فقط
  }

  return items
}
