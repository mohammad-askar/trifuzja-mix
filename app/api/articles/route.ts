// 📁 app/api/articles/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import type { Filter } from 'mongodb';
import clientPromise from '@/types/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

/* ------------------------------------------------------------------ */
/*                               Types                                */
/* ------------------------------------------------------------------ */

interface CoverPos { x: number; y: number }

interface ArticleMeta {
  coverPosition?: CoverPos | 'top' | 'center' | 'bottom';
  [key: string]: unknown;
}

/** مستند المقال (بولندي فقط + دائمًا منشور) */
export interface ArticleDoc {
  _id?: string;
  slug: string;
  title: string;
  excerpt?: string;
  content?: string;        // HTML
  categoryId?: string;     // قد لا يوجد مع فيديو فقط
  coverUrl?: string;
  videoUrl?: string;
  status?: 'published';
  isVideoOnly?: boolean;   // ← مفتاح التمييز
  createdAt: Date;
  updatedAt: Date;
  readingTime?: string;
  meta?: ArticleMeta;
}

/* ------------------------------------------------------------------ */
/*                              Helpers                               */
/* ------------------------------------------------------------------ */

const responseError = (msg: string, status = 400) =>
  NextResponse.json({ error: msg }, { status });

const relativeOrAbsoluteUrl = z
  .string()
  .refine(
    (v) =>
      !v ||
      v.startsWith('http://') ||
      v.startsWith('https://') ||
      v.startsWith('/uploads/'),
    'Invalid URL',
  );

/** إزالة وسوم HTML ثم قياس الطول */
function plainTextLen(html?: string): number {
  if (!html) return 0;
  return html.replace(/<[^>]+>/g, ' ').trim().replace(/\s+/g, ' ').length;
}

/** اعتبر المحتوى فارغًا لو ≤ 20 حرف بعد نزع الوسوم */
function isEffectivelyEmpty(html?: string): boolean {
  return plainTextLen(html) <= 20;
}

/* ------------------------------------------------------------------ */
/*                               GET (list)                           */
/* ------------------------------------------------------------------ */
/**
 * Supported query params:
 * - ?pageNo=1&limit=9
 * - ?cat=catId  or ?cat=cat1,cat2  or repeated ?cat=...
 * - ?videoOnly=1 (videos only)
 * - ?search=foo  (NEW: case-insensitive match on title or slug)
 */
export async function GET(req: NextRequest) {
  try {
    const SearchSchema = z.object({
      pageNo: z.coerce.number().int().min(1).default(1),
      limit : z.coerce.number().int().min(1).max(50).default(9),
      videoOnly: z.union([z.literal('1'), z.literal('true')]).optional(),
      // NOTE: we read `search` manually below, because Object.fromEntries drops duplicate keys (cat)
    });

    const rawParams = Object.fromEntries(req.nextUrl.searchParams);
    const qp = SearchSchema.parse(rawParams);

    // categories: allow multiples
    const catsArray = req.nextUrl.searchParams
      .getAll('cat')
      .flatMap(v => v.split(',').map(s => s.trim()).filter(Boolean));

    // --- NEW: search term ---
    const searchRaw = (req.nextUrl.searchParams.get('search') ?? '').trim();

    // helper to escape user input for regex
    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Only published (or legacy docs without status)
    const filter: Filter<ArticleDoc> = {
      $or: [{ status: 'published' }, { status: { $exists: false } }],
    };

    // categories
    if (catsArray.length === 1) {
      filter.categoryId = catsArray[0];
    } else if (catsArray.length > 1) {
      filter.categoryId = { $in: catsArray };
    }

    // videos vs. articles
    if (qp.videoOnly) {
      filter.isVideoOnly = true;
      (filter as Record<string, unknown>).videoUrl = { $exists: true, $ne: '' };
    } else {
      filter.isVideoOnly = { $ne: true };
    }

    // --- NEW: apply search on title OR slug (case-insensitive) ---
    if (searchRaw.length > 0) {
      const rx = new RegExp(escapeRegExp(searchRaw), 'i');
      const and = (filter as Record<string, unknown>).$and as object[] | undefined;
      (filter as Record<string, unknown>).$and = [
        ...(and ?? []),
        { $or: [{ title: rx }, { slug: rx }] },
      ];
    }

    const db = (await clientPromise).db();
    const coll = db.collection<ArticleDoc>('articles');

    const skip = (qp.pageNo - 1) * qp.limit;

    const cursor = coll
      .find(filter, {
        projection: {
          slug: 1,
          title: 1,
          excerpt: 1,
          categoryId: 1,
          coverUrl: 1,
          videoUrl: 1,
          isVideoOnly: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          readingTime: 1,
          'meta.coverPosition': 1,
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(qp.limit);

    const docs = await cursor.toArray();
    const total = await coll.countDocuments(filter);

    const articles = docs.map((d) => ({
      _id: d._id?.toString(),
      slug: d.slug,
      title: d.title,
      excerpt: d.excerpt ?? '',
      categoryId: d.categoryId,
      coverUrl: d.coverUrl,
      videoUrl: d.videoUrl,
      isVideoOnly: d.isVideoOnly === true,
      status: d.status,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      readingTime: d.readingTime,
      meta: d.meta?.coverPosition ? { coverPosition: d.meta.coverPosition } : undefined,
    }));

    const res = NextResponse.json({
      articles,
      total,
      pageNo: qp.pageNo,
      limit: qp.limit,
      pages: Math.ceil(total / qp.limit),
    });
    res.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res;
  } catch (err) {
    if (err instanceof ZodError) {
      return responseError(err.issues.map((i) => i.message).join(' | '));
    }
    console.error('GET /api/articles', err);
    return responseError('Server error', 500);
  }
}


/* ------------------------------------------------------------------ */
/*                              POST (create)                         */
/* ------------------------------------------------------------------ */
/** إنشاء مقال أحادي اللغة، ونشره مباشرةً (status='published'). */
const ArticleSchema = z.object({
  title: z.string().trim().min(1),
  excerpt: z.string().trim().optional(),
  content: z.string().trim().optional(),  // HTML
  slug: z.string().trim().min(3),
  categoryId: z.string().trim().optional(), // قد يكون فارغًا للفيديو فقط
  coverUrl: relativeOrAbsoluteUrl.optional(),
  videoUrl: relativeOrAbsoluteUrl.optional(),
  /** إن أرسلته من الواجهة نعتمده، وإلا نحسبه تلقائيًا */
  isVideoOnly: z.boolean().optional(),
  meta: z
    .object({
      coverPosition: z
        .union([
          z.object({ x: z.number(), y: z.number() }),
          z.enum(['top', 'center', 'bottom']),
        ])
        .optional(),
    })
    .passthrough()
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!session || (role !== 'admin' && role !== 'editor')) {
      return responseError('Unauthorized', 403);
    }

    const parsed = ArticleSchema.parse(await req.json());

    const db = (await clientPromise).db();
    const coll = db.collection<ArticleDoc>('articles');

    // slug يجب أن يكون فريدًا
    const dup = await coll.findOne({ slug: parsed.slug });
    if (dup) return responseError('Slug already exists', 409);

    const now = new Date();

    // تحديد isVideoOnly:
    // - أولوية للحقل المُرسل من الواجهة إن وُجد.
    // - وإلا: لو يوجد videoUrl والمحتوى فعليًا فارغ → true؛ غير ذلك false.
    const computedIsVideoOnly =
      typeof parsed.isVideoOnly === 'boolean'
        ? parsed.isVideoOnly
        : !!parsed.videoUrl && isEffectivelyEmpty(parsed.content);

    // حساب وقت القراءة من المحتوى الأحادي (إن وُجد ومتى لم يكن فيديو فقط)
    let readingTime: string | undefined;
    if (!computedIsVideoOnly) {
      const firstContent = parsed.content ?? '';
      const words = firstContent.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
      const minutes = Math.max(1, Math.ceil(words / 200));
      readingTime = `${minutes} min read`;
    }

    const doc: ArticleDoc = {
      slug: parsed.slug,
      title: parsed.title,
      excerpt: parsed.excerpt,
      content: parsed.content,
      // نخزّن التصنيف لو أُرسل فقط (الفيديو قد لا يملك تصنيفًا)
      ...(parsed.categoryId ? { categoryId: parsed.categoryId } : {}),
      coverUrl: parsed.coverUrl,
      videoUrl: parsed.videoUrl,
      isVideoOnly: computedIsVideoOnly,
      meta: parsed.meta,
      status: 'published',
      createdAt: now,
      updatedAt: now,
      readingTime,
    };

    await coll.insertOne(doc);

    return NextResponse.json({ slug: parsed.slug }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return responseError(err.issues.map((i) => i.message).join(' | '));
    }
    console.error('POST /api/articles', err);
    return responseError('Server error', 500);
  }
}
