// 📁 app/api/videos/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import type { Filter } from 'mongodb';
import clientPromise from '@/types/mongodb';

/* ----------------------------- Types ----------------------------- */
interface CoverPos { x: number; y: number }

interface ArticleMeta {
  coverPosition?: CoverPos | 'top' | 'center' | 'bottom';
  [key: string]: unknown;
}

interface ArticleDoc {
  _id?: string;
  slug: string;
  title: string;
  excerpt?: string;
  content?: string;
  categoryId?: string;    // قد تكون غير موجودة للفيديو فقط
  coverUrl?: string;
  videoUrl?: string;
  status?: 'published';
  isVideoOnly?: boolean;
  createdAt: Date;
  updatedAt: Date;
  readingTime?: string;
  meta?: ArticleMeta;
}

/* ---------------------------- Helpers ---------------------------- */
const responseError = (msg: string, status = 400) =>
  NextResponse.json({ error: msg }, { status });

/* ------------------------------ GET ------------------------------ */
/**
 * يدعم:
 * - ?pageNo=1&limit=9
 * - ?cat=catId   أو ?cat=cat1,cat2   أو تكرار cat عدة مرات
 * يعيد فقط الوثائق المنشورة أو القديمة التي لا تملك status،
 * ويجلب الفيديوهات فقط (isVideoOnly=true) مع التأكد من وجود videoUrl.
 */
export async function GET(req: NextRequest) {
  try {
    const SearchSchema = z.object({
      pageNo: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(9),
    });

    const rawParams = Object.fromEntries(req.nextUrl.searchParams);
    const qp = SearchSchema.parse(rawParams);

    // (?cat=...) يسمح بعدة قيم / مفصولة بفواصل
    const catsArray = req.nextUrl.searchParams
      .getAll('cat')
      .flatMap((v) => v.split(',').map((s) => s.trim()).filter(Boolean));

    // فقط المنشور أو القديم بلا status
    const filter: Filter<ArticleDoc> = {
      $or: [{ status: 'published' }, { status: { $exists: false } }],
      isVideoOnly: true,
      // تأكيد وجود رابط فيديو صالح
      videoUrl: { $exists: true, $ne: '' },
    };

    if (catsArray.length === 1) {
      filter.categoryId = catsArray[0];
    } else if (catsArray.length > 1) {
      filter.categoryId = { $in: catsArray };
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

    const videos = docs.map((d) => ({
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
      articles: videos,                  // نفس المفتاح لتوافق الواجهات الحالية
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
    console.error('GET /api/videos', err);
    return responseError('Server error', 500);
  }
}
