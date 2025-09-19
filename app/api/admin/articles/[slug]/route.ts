// 📁 app/api/admin/articles/[slug]/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/types/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { z, ZodError } from 'zod';
import type { ObjectId } from 'mongodb';

/* ------------------------------------------------------------------ */
/*                           Types & Helpers                           */
/* ------------------------------------------------------------------ */

// في App Router قد يأتي params كـ Promise — ننتظره دائماً
type Ctx = { params: Promise<{ slug: string }> };

interface ArticleDocDb {
  _id: ObjectId;
  slug: string;
  title: string;
  excerpt?: string;
  content?: string;            // ← صارت اختيارية لدعم videoOnly
  categoryId: string;
  coverUrl?: string;
  heroImageUrl?: string;       // توافقية
  videoUrl?: string;
  videoOnly?: boolean;         // ← جديد
  status?: 'published';
  createdAt: Date;
  updatedAt: Date;
  readingTime?: string;
  meta?: Record<string, unknown>;
}

interface ArticleDocApi extends Omit<ArticleDocDb, '_id'> {
  _id: string;
}

type AdminSessionShape =
  | {
      user?: { role?: string | null } | null;
    }
  | null
  | undefined;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function requireAdmin(session: unknown): session is AdminSessionShape & {
  user: { role: string };
} {
  if (!isObject(session)) return false;
  const user = (session as Record<string, unknown>)['user'];
  if (!isObject(user)) return false;
  const role = (user as Record<string, unknown>)['role'];
  return role === 'admin';
}

function normalizeSlug(raw: string) {
  const slug = raw.trim().toLowerCase();
  if (!/^[a-z0-9-]{3,}$/.test(slug)) throw new Error('Invalid slug');
  return slug;
}

// URL مطلق http/https أو مسار يبدأ بـ /
const relativeOrAbsoluteUrl = z
  .string()
  .min(1)
  .refine(
    (v) =>
      v.startsWith('http://') ||
      v.startsWith('https://') ||
      v.startsWith('/'),
    { message: 'Invalid URL' },
  );

// ✅ مخطط أحادي اللغة (لا en/pl) + دعم videoOnly
const UpsertSchema = z
  .object({
    title: z.string().min(1),
    excerpt: z.string().optional(),
    content: z.string().optional(), // ← لم تعد إلزامية
    categoryId: z.string().min(1, 'categoryId is required'),
    coverUrl: relativeOrAbsoluteUrl.optional(),
    heroImageUrl: relativeOrAbsoluteUrl.optional(), // للتوافقية
    videoUrl: relativeOrAbsoluteUrl.optional(),
    videoOnly: z.boolean().optional(),              // ← جديد
    // نقبل رقمًا أو نصًا عند الإدخال ونحوّله لاحقًا إلى نص
    readingTime: z.union([z.number().int().nonnegative(), z.string().min(1)]).optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((data, ctx) => {
    const isVideo = data.videoOnly === true;

    if (isVideo && !data.videoUrl) {
      ctx.addIssue({
        path: ['videoUrl'],
        code: z.ZodIssueCode.custom,
        message: 'videoUrl is required when videoOnly is true',
      });
    }

    if (!isVideo) {
      const c = (data.content ?? '').trim();
      if (!c) {
        ctx.addIssue({
          path: ['content'],
          code: z.ZodIssueCode.custom,
          message: 'content is required when videoOnly is false',
        });
      }
    }
  });

function computeReadingTimeFromHtml(html?: string) {
  if (!html) return undefined;
  const words = html
    .replace(/<[^>]+>/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

function responseError(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function toPlainStringReadingTime(rt?: number | string): string | undefined {
  if (rt === undefined) return undefined;
  return typeof rt === 'number' ? String(rt) : rt;
}

/* ------------------------------------------------------------------ */
/*                               GET                                   */
/* ------------------------------------------------------------------ */

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { slug: rawSlug } = await ctx.params;
  const session = await getServerSession(authOptions);
  if (!requireAdmin(session)) return responseError('Unauthorized', 401);

  try {
    const slug = normalizeSlug(rawSlug);
    const db = (await clientPromise).db();
    const article = await db
      .collection<ArticleDocDb>('articles')
      .findOne({ slug });

    if (!article) return responseError('Not found', 404);

    const out: ArticleDocApi = {
      ...article,
      _id: article._id.toString(),
    };

    return NextResponse.json(out, { status: 200 });
  } catch (e) {
    if (e instanceof Error && e.message === 'Invalid slug') {
      return responseError('Invalid slug', 400);
    }
    console.error('GET /api/admin/articles/[slug] error:', e);
    return responseError('Internal Server Error', 500);
  }
}

/* ------------------------------------------------------------------ */
/*                               PUT (Upsert)                          */
/* ------------------------------------------------------------------ */

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { slug: rawSlug } = await ctx.params;
  const session = await getServerSession(authOptions);
  if (!requireAdmin(session)) return responseError('Unauthorized', 401);

  try {
    const slug = normalizeSlug(rawSlug);
    const body = UpsertSchema.parse(await req.json());

    // readingTime: إن لم يُرسل وحال وجود content نحسبه
    let readingTime = toPlainStringReadingTime(body.readingTime);
    if (!readingTime && body.content) {
      readingTime = computeReadingTimeFromHtml(body.content);
    }

    const now = new Date();
    const db = (await clientPromise).db();
    const coll = db.collection<ArticleDocDb>('articles');

    const cover = body.coverUrl ?? body.heroImageUrl;

    // ✅ ننشر دائمًا: status: 'published'
    const set: Partial<ArticleDocDb> = {
      slug,
      title: body.title,
      categoryId: body.categoryId,
      updatedAt: now,
      status: 'published',
    };

    // حقول اختيارية — لا نضع undefined
    if (body.content !== undefined) set.content = body.content;
    if (body.excerpt !== undefined) set.excerpt = body.excerpt;
    if (body.videoUrl !== undefined) set.videoUrl = body.videoUrl;
    if (body.videoOnly !== undefined) set.videoOnly = body.videoOnly;
    if (body.meta !== undefined) set.meta = body.meta as Record<string, unknown>;
    if (readingTime !== undefined) set.readingTime = readingTime;

    if (cover !== undefined) {
      set.coverUrl = cover;
      set.heroImageUrl = cover; // إبقاء الحقل للتوافق
    }

    const res = await coll.updateOne(
      { slug },
      {
        $set: set,
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    const created = res.upsertedCount > 0;
    return NextResponse.json({ ok: true, slug, created }, { status: created ? 201 : 200 });
  } catch (e) {
    if (e instanceof ZodError) {
      return responseError(e.issues.map((i) => i.message).join(' | '), 400);
    }
    if (e instanceof Error && e.message === 'Invalid slug') {
      return responseError('Invalid slug', 400);
    }
    console.error('PUT /api/admin/articles/[slug] error:', e);
    return responseError('Internal Server Error', 500);
  }
}

/* ------------------------------------------------------------------ */
/*                               DELETE                                */
/* ------------------------------------------------------------------ */

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { slug: rawSlug } = await ctx.params;
  const session = await getServerSession(authOptions);
  if (!requireAdmin(session)) return responseError('Unauthorized', 401);

  try {
    const slug = normalizeSlug(rawSlug);
    const db = (await clientPromise).db();
    const res = await db.collection<ArticleDocDb>('articles').deleteOne({ slug });
    if (res.deletedCount === 0) return responseError('Not found', 404);
    return NextResponse.json({ ok: true, slug }, { status: 200 });
  } catch (e) {
    if (e instanceof Error && e.message === 'Invalid slug') {
      return responseError('Invalid slug', 400);
    }
    console.error('DELETE /api/admin/articles/[slug] error:', e);
    return responseError('Internal Server Error', 500);
  }
}
