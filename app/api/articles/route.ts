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
  /** لا نستخدم draft بعد الآن: الجديد دائمًا published (القديم قد لا يملك status) */
  status?: 'published';
  /** يحدّد أن المقال فيديو فقط (لا نص يُعتدّ به) */
  isVideoOnly?: boolean;
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

/** URL مطلق http/https أو أي مسار يبدأ بـ / */
const relativeOrAbsoluteUrl = z
  .string()
  .refine(
    (v) =>
      !v ||
      v.startsWith('http://') ||
      v.startsWith('https://') ||
      v.startsWith('/'),
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
 * الاستعلامات المدعومة:
 * - ?pageNo=1&limit=9
 * - ?cat=catId  أو ?cat=cat1,cat2  أو تكرار cat عدة مرات
 * - ?videoOnly=1 أو ?video=1  ← يجلب فقط المقالات من نوع فيديو فقط
 * يرجع فقط المنشور، وكذلك السجلات القديمة التي قد لا تملك status.
 */
export async function GET(req: NextRequest) {
  try {
    const TruthyParam = z.union([z.literal('1'), z.literal('true')]);

    const SearchSchema = z.object({
      pageNo: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(9),
      videoOnly: TruthyParam.optional(),
      video: TruthyParam.optional(), // alias إضافي
    });

    const rawParams = Object.fromEntries(req.nextUrl.searchParams);
    const qp = SearchSchema.parse(rawParams);

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

    // فلترة فيديو فقط إن طُلبت
    const wantVideoOnly = !!(qp.videoOnly || qp.video);
    if (wantVideoOnly) {
      filter.isVideoOnly = true;
      // كتحسّب إضافي: تأكد من وجود videoUrl
      (filter as Record<string, unknown>).videoUrl = { $exists: true, $ne: '' };
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
      isVideoOnly: d.isVideoOnly === true, // دائمًا boolean
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
  /** إن أرسلته من الواجهة نعتمده، وإلا نحسبه تلقائيًا (انظر أدناه) */
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

    // حساب وقت القراءة من المحتوى الأحادي (إن وُجد)
    const firstContent = parsed.content ?? '';
    const words = firstContent.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(words / 200));

    // تحديد isVideoOnly:
    // - أولوية للحقل المُرسل من الواجهة إن وُجد.
    // - وإلا: لو يوجد videoUrl والمحتوى فعليًا فارغ → true؛ غير ذلك false.
    const computedIsVideoOnly =
      typeof parsed.isVideoOnly === 'boolean'
        ? parsed.isVideoOnly
        : !!parsed.videoUrl && isEffectivelyEmpty(parsed.content);

    const doc: ArticleDoc = {
      slug: parsed.slug,
      title: parsed.title,
      excerpt: parsed.excerpt,
      content: parsed.content,
      categoryId: parsed.categoryId,
      coverUrl: parsed.coverUrl,
      videoUrl: parsed.videoUrl,
      isVideoOnly: computedIsVideoOnly,
      meta: parsed.meta,
      status: 'published',                // ننشر مباشرةً
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
