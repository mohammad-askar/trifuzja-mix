// 📁 app/api/articles/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import type { Filter } from 'mongodb';
import clientPromise from '@/types/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

interface CoverPos { x: number; y: number }
interface ArticleMeta {
  coverPosition?: CoverPos | 'top' | 'center' | 'bottom';
  [key: string]: unknown;
}

export interface ArticleDoc {
  _id?: string;
  slug: string;
  title: Record<string, string>;
  excerpt?: Record<string, string>;
  content?: Record<string, string>;
  categoryId: string;
  coverUrl?: string;
  videoUrl?: string;
  status?: 'draft' | 'published';
  createdAt: Date;
  updatedAt: Date;
  readingTime?: string;
  meta?: ArticleMeta;
}

/* ---------- Helpers ---------- */
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

/* ---------- GET (list) ---------- */
export async function GET(req: NextRequest) {
  try {
    const SearchSchema = z.object({
      locale: z.enum(['en', 'pl']).default('en'),
      pageNo: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(9),
    });

    const qp = SearchSchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );

    // (?cat=... — multiple allowed)
    const catsArray = req.nextUrl.searchParams
      .getAll('cat')
      .flatMap((v) => v.split(',').filter(Boolean));

    // Only published (or legacy docs without status)
    const filter: Filter<ArticleDoc> = {
      $or: [{ status: 'published' }, { status: { $exists: false } }],
    };
    if (catsArray.length === 1) filter.categoryId = catsArray[0];
    else if (catsArray.length > 1) filter.categoryId = { $in: catsArray };

    const skip = (qp.pageNo - 1) * qp.limit;

    const db = (await clientPromise).db();
    const coll = db.collection<ArticleDoc>('articles');

    // ✅ Inclusion-only projection (avoids inclusion/exclusion conflict)
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

    const pick = (obj?: Record<string, string>) =>
      obj?.[qp.locale] ?? Object.values(obj ?? {})[0] ?? '';

    const articles = docs.map((d) => ({
      _id: d._id?.toString(),
      slug: d.slug,
      categoryId: d.categoryId,
      coverUrl: d.coverUrl,
      videoUrl: d.videoUrl,
      status: d.status,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      readingTime: d.readingTime,
      meta: d.meta?.coverPosition
        ? { coverPosition: d.meta.coverPosition }
        : undefined,
      title: pick(d.title),
      excerpt: pick(d.excerpt),
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
    if (err instanceof ZodError)
      return responseError(err.issues.map((i) => i.message).join(' | '));
    console.error('GET /api/articles', err);
    return responseError('Server error', 500);
  }
}

/* ---------- POST (create) ---------- */
// No page/status in body — we publish directly
const ArticleSchema = z.object({
  title: z.record(z.string(), z.string()),
  excerpt: z.record(z.string(), z.string()).optional(),
  content: z.record(z.string(), z.string()).optional(),
  slug: z.string().min(3),
  categoryId: z.string().min(1),
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

    const dup = await coll.findOne({ slug: parsed.slug });
    if (dup) return responseError('Slug already exists', 409);

    const now = new Date();

    const firstContent = parsed.content
      ? Object.values(parsed.content)[0] || ''
      : '';
    const words = firstContent.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(words / 200));

    await coll.insertOne({
      ...parsed,
      status: 'published', // publish directly
      createdAt: now,
      updatedAt: now,
      readingTime: `${minutes} min read`,
    });

    return NextResponse.json({ slug: parsed.slug }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError)
      return responseError(err.issues.map((i) => i.message).join(' | '));
    console.error('POST /api/articles', err);
    return responseError('Server error', 500);
  }
}
