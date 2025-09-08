// 📁 app/api/articles/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import type { Filter } from 'mongodb';
import clientPromise from '@/types/mongodb';
import { PAGES, PageKey } from '@/types/constants/pages';

/* ---------- Types ---------- */
export interface ArticleDoc {
  _id?: string;
  title:    Record<string, string>;
  excerpt?: Record<string, string>;
  content?: Record<string, string>;
  slug: string;
  page: PageKey;
  categoryId: string;
  coverUrl?: string;
  videoUrl?: string;
  status: 'draft' | 'published';
  createdAt: Date;
  updatedAt: Date;
  readingTime?: string;
}

/* ---------- Helpers ---------- */
const pageEnum = z.enum(PAGES.map(p => p.key) as [PageKey, ...PageKey[]]);

const responseError = (msg: string, status = 400) =>
  NextResponse.json({ error: msg }, { status });

const relativeOrAbsoluteUrl = z.string().refine(
  v =>
    !v ||
    v.startsWith('http://') ||
    v.startsWith('https://') ||
    v.startsWith('/uploads/'),
  'Invalid URL'
);

/* ---------- GET (list) ---------- */
export async function GET(req: NextRequest) {
  try {
    const SearchSchema = z.object({
      page:   pageEnum.nullish(),
      locale: z.enum(['en', 'pl']).default('en'),
      pageNo: z.coerce.number().int().min(1).default(1),
      limit:  z.coerce.number().int().min(1).max(50).default(9),
    });

    const qp = SearchSchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    // categories (?cat= أو متعددة)
    const catsArray = req.nextUrl.searchParams
      .getAll('cat')
      .flatMap(v => v.split(',').filter(Boolean));

    const filter: Filter<ArticleDoc> = { status: 'published' };
    if (qp.page) filter.page = qp.page;
    if (catsArray.length === 1) filter.categoryId = catsArray[0];
    else if (catsArray.length > 1) filter.categoryId = { $in: catsArray };

    const skip = (qp.pageNo - 1) * qp.limit;

    const db = (await clientPromise).db();
    const coll = db.collection<ArticleDoc>('articles');

    const cursor = coll
      .find(filter, { projection: { content: 0 } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(qp.limit);

    const docs  = await cursor.toArray();
    const total = await coll.countDocuments(filter);

    const pick = (obj?: Record<string,string>) =>
      obj?.[qp.locale] ?? Object.values(obj ?? {})[0] ?? '';

    const articles = docs.map(d => ({
      _id:        d._id?.toString(),
      slug:       d.slug,
      page:       d.page,
      categoryId: d.categoryId,
      coverUrl:   d.coverUrl,
      videoUrl:   d.videoUrl,
      status:     d.status,
      createdAt:  d.createdAt,
      updatedAt:  d.updatedAt,
      readingTime:d.readingTime,
      title:      pick(d.title),
      excerpt:    pick(d.excerpt),
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
      return responseError(err.issues.map(i => i.message).join(' | '));
    console.error('GET /api/articles', err);
    return responseError('Server error', 500);
  }
}

/* ---------- POST (create) ---------- */
const ArticleSchema = z.object({
  title:      z.record(z.string(), z.string()),       // { en:"", pl:"" } أو لغة واحدة
  excerpt:    z.record(z.string(), z.string()).optional(),
  content:    z.record(z.string(), z.string()).optional(),
  slug:       z.string().min(3),
  page:       pageEnum,
  categoryId: z.string(),
  coverUrl:   relativeOrAbsoluteUrl.optional(),
  videoUrl:   relativeOrAbsoluteUrl.optional(),
  status:     z.enum(['draft', 'published']),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = ArticleSchema.parse(await req.json());

    const db  = (await clientPromise).db();
    const coll = db.collection<ArticleDoc>('articles');

    const dup = await coll.findOne({ slug: parsed.slug });
    if (dup) return responseError('Slug already exists', 409);

    const now = new Date();

    // (اختياري) حساب قراءة بناءً على أوّل محتوى متاح
    const firstContent = parsed.content
      ? Object.values(parsed.content)[0] || ''
      : '';
    const words = firstContent.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(words / 200)); // متوسط 200 كلمة/دقيقة

    await coll.insertOne({
      ...parsed,
      createdAt: now,
      updatedAt: now,
      readingTime: `${minutes} min read`,
    });

    return NextResponse.json({ slug: parsed.slug }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError)
      return responseError(err.issues.map(i => i.message).join(' | '));
    console.error('POST /api/articles', err);
    return responseError('Server error', 500);
  }
}
