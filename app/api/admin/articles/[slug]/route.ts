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

// App Router can pass params as a Promise — always await
type Ctx = { params: Promise<{ slug: string }> };

interface ArticleDocDb {
  _id: ObjectId;
  slug: string;
  title: string;
  excerpt?: string;
  content?: string;               // optional to support video-only
  categoryId?: string;            // may be absent for video-only
  coverUrl?: string;
  heroImageUrl?: string;          // legacy mirror
  videoUrl?: string;
  videoOnly?: boolean;            // internal flag
  isVideoOnly?: boolean;          // public API compatibility
  status?: 'published';
  createdAt?: Date;               // set on insert
  updatedAt: Date;
  readingTime?: string;
  meta?: Record<string, unknown>;
}

interface ArticleDocApi extends Omit<ArticleDocDb, '_id'> {
  _id: string;
}

type AdminSessionShape =
  | { user?: { role?: string | null } | null }
  | null
  | undefined;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function requireAdmin(session: unknown): session is AdminSessionShape & {
  user: { role: string };
} {
  if (!isObject(session)) return false;
  const user = (session as Record<string, unknown>).user;
  if (!isObject(user)) return false;
  const role = (user as Record<string, unknown>).role;
  return role === 'admin';
}

function normalizeSlug(raw: string) {
  const slug = raw.trim().toLowerCase();
  if (!/^[a-z0-9-]{3,}$/.test(slug)) throw new Error('Invalid slug');
  return slug;
}

// Absolute http/https or app path starting with /
const urlSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (v) => v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/'),
    { message: 'Invalid URL' },
  );

// Accept both videoOnly & isVideoOnly; categoryId optional when video-only
const UpsertSchema = z
  .object({
    title: z.string().trim().min(1),
    excerpt: z.string().trim().optional(),
    content: z.string().trim().optional(),        // not required anymore
    categoryId: z.string().trim().optional(),     // optional for video-only
    coverUrl: urlSchema.optional(),
    heroImageUrl: urlSchema.optional(),           // legacy mirror
    videoUrl: urlSchema.optional(),
    videoOnly: z.boolean().optional(),
    isVideoOnly: z.boolean().optional(),
    readingTime: z.union([z.number().int().nonnegative(), z.string().trim().min(1)]).optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((data, ctx) => {
    const isVideo = (data.videoOnly ?? data.isVideoOnly) === true;

    if (isVideo) {
      // Video-only: require videoUrl; no need for content/categoryId
      if (!data.videoUrl) {
        ctx.addIssue({
          path: ['videoUrl'],
          code: z.ZodIssueCode.custom,
          message: 'videoUrl is required when videoOnly is true',
        });
      }
    } else {
      // Text article: require non-empty content and categoryId
      const c = (data.content ?? '').replace(/<[^>]+>/g, '').trim();
      if (!c) {
        ctx.addIssue({
          path: ['content'],
          code: z.ZodIssueCode.custom,
          message: 'content is required when videoOnly is false',
        });
      }
      if (!data.categoryId) {
        ctx.addIssue({
          path: ['categoryId'],
          code: z.ZodIssueCode.custom,
          message: 'categoryId is required when videoOnly is false',
        });
      }
    }
  });

function computeReadingTimeFromHtml(html?: string) {
  if (!html) return undefined;
  const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
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

// يحذف المفاتيح التي قيمتها undefined لمنع إرسالها داخل $set
function pruneUndefined<T extends Record<string, unknown>>(obj: T): T {
  for (const k of Object.keys(obj)) {
    if (obj[k] === undefined) delete obj[k];
  }
  return obj;
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
    const article = await db.collection<ArticleDocDb>('articles').findOne({ slug });

    if (!article) return responseError('Not found', 404);

    // Normalize the flags on output as well
    const videoOnlyFlag = article.videoOnly ?? article.isVideoOnly ?? false;
    const out: ArticleDocApi = {
      ...article,
      videoOnly: videoOnlyFlag,
      isVideoOnly: videoOnlyFlag,
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

    // derive the unified flag
    const videoOnlyFlag = (body.videoOnly ?? body.isVideoOnly) === true;

    // readingTime only for text posts (and only if not provided)
    let readingTime = toPlainStringReadingTime(body.readingTime);
    if (!videoOnlyFlag && !readingTime && body.content) {
      readingTime = computeReadingTimeFromHtml(body.content);
    }

    const now = new Date();
    const db = (await clientPromise).db();
    const coll = db.collection<ArticleDocDb>('articles');

    const cover = body.coverUrl ?? body.heroImageUrl;

    // ----------- $unset أولاً لتحديد ما سيُزال -----------
    const unset: Record<string, ''> = {};
    if (videoOnlyFlag) {
      if (!body.categoryId || body.categoryId === '') unset.categoryId = '';
      if (!body.content || body.content.trim() === '') {
        unset.content = '';
        unset.readingTime = '';
      }
    }

    // ----------- $set بدون مفاتيح undefined وبعيدًا عن مفاتيح $unset -----------
    const setRaw: Partial<ArticleDocDb> = {
      slug,
      title: body.title,
      updatedAt: now,
      status: 'published',
      videoOnly: videoOnlyFlag,
      isVideoOnly: videoOnlyFlag, // keep both for compatibility
      // حقول اختيارية (قد تكون undefined)
      excerpt: body.excerpt,
      content: body.content,                 // سنحذفه لاحقًا إن كان undefined
      videoUrl: body.videoUrl,
      meta: body.meta as Record<string, unknown> | undefined,
      readingTime,
      coverUrl: cover,
      heroImageUrl: cover,
      categoryId: body.categoryId && body.categoryId !== '' ? body.categoryId : undefined,
    };

    // إزالة المفاتيح undefined
    const setClean = pruneUndefined(setRaw);

    // لا تسمح بوضع حقول في $set موجودة أيضًا في $unset (تجنّب التعارض)
    for (const key of Object.keys(unset)) {
      delete (setClean as Record<string, unknown>)[key];
    }

    const updateDoc: {
      $set: Partial<ArticleDocDb>;
      $unset?: Record<string, ''>;
      $setOnInsert: { createdAt: Date };
    } = {
      $set: setClean,
      $setOnInsert: { createdAt: now },
    };
    if (Object.keys(unset).length) updateDoc.$unset = unset;

    const res = await coll.updateOne({ slug }, updateDoc, { upsert: true });

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
