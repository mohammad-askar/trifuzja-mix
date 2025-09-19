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
  // حقول إضافية اختيارية
  [key: string]: unknown;
}

/** مستند المقال (بولندي فقط + دائمًا منشور) */
export interface ArticleDoc {
  _id?: string;
  slug: string;
  title: string;           // نص واحد فقط
  excerpt?: string;        // نص واحد فقط
  content?: string;        // HTML نصّي واحد
  categoryId: string;
  coverUrl?: string;
  videoUrl?: string;
  /** لا نستخدم draft بعد الآن. السجلات الجديدة دائمًا published.
   * أبقيناه اختياريًا لدعم السجلات القديمة التي قد لا تملك status. */
  status?: 'published';
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

/* ------------------------------------------------------------------ */
/*                               GET (list)                           */
/* ------------------------------------------------------------------ */
/**
 * الاستعلامات المدعومة:
 * - ?pageNo=1&limit=9
 * - ?cat=catId  أو ?cat=cat1,cat2  أو تكرار cat عدة مرات
 * يرجع فقط المنشور، وكذلك السجلات القديمة التي قد لا تملك status.
 */
export async function GET(req: NextRequest) {
  try {
    const SearchSchema = z.object({
      pageNo: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(9),
    });
    const qp = SearchSchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    // (?cat=... — يسمح بعدّة قيَم)
    const catsArray = req.nextUrl.searchParams
      .getAll('cat')
      .flatMap((v) => v.split(',').map((s) => s.trim()).filter(Boolean));

    // فقط المنشور، أو وثائق قديمة بلا status (توافق رجعي)
    const filter: Filter<ArticleDoc> = {
      $or: [{ status: 'published' }, { status: { $exists: false } }],
    };
    if (catsArray.length === 1) {
      filter.categoryId = catsArray[0];
    } else if (catsArray.length > 1) {
      filter.categoryId = { $in: catsArray };
    }

    const skip = (qp.pageNo - 1) * qp.limit;

    const db = (await clientPromise).db();
    const coll = db.collection<ArticleDoc>('articles');

    // إسقاط المحتوى الكبير من القائمة (نُظهر الملخّص فقط)
    const cursor = coll
      .find(filter, {
        projection: {
          slug: 1,
          title: 1,
          excerpt: 1,
          categoryId: 1,
          coverUrl: 1,
          videoUrl: 1,
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
      status: d.status, // ستكون 'published' أو غير موجودة في القديم
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
  categoryId: z.string().trim().min(1),
  coverUrl: relativeOrAbsoluteUrl.optional(),
  videoUrl: relativeOrAbsoluteUrl.optional(),
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

    // حساب وقت القراءة من المحتوى الأحادي (إن وُجد)
    const firstContent = parsed.content ?? '';
    const words = firstContent.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(words / 200));

    const doc: ArticleDoc = {
      slug: parsed.slug,
      title: parsed.title,
      excerpt: parsed.excerpt,
      content: parsed.content,
      categoryId: parsed.categoryId,
      coverUrl: parsed.coverUrl,
      videoUrl: parsed.videoUrl,
      meta: parsed.meta,
      status: 'published',          // ✅ ننشر مباشرةً، لا draft
      createdAt: now,
      updatedAt: now,
      readingTime: `${minutes} min read`,
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
