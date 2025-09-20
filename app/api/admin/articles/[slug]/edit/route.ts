// 📁 app/api/admin/articles/[slug]/edit/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/types/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { z } from 'zod';
import type { ObjectId } from 'mongodb';

/* -------------------------------- Types -------------------------------- */

type Ctx = { params: Promise<{ slug: string }> };

interface ArticleDocDb {
  _id: ObjectId;
  slug: string;
  title: string;
  excerpt?: string;
  content?: string;          // optional to support video-only
  categoryId?: string;
  coverUrl?: string;
  heroImageUrl?: string;     // legacy mirror
  videoUrl?: string;
  videoOnly?: boolean;       // internal
  isVideoOnly?: boolean;     // public API compat
  status?: 'published';
  createdAt?: Date;
  updatedAt: Date;
  readingTime?: string;
  meta?: Record<string, unknown>;
}

interface ArticleDocApi extends Omit<ArticleDocDb, '_id'> {
  _id: string;
}

/* ------------------------------- Schemas ------------------------------- */

// Absolute URL or app path
const urlOrAppPath = z
  .string()
  .min(1)
  .refine((val) => /^https?:\/\//.test(val) || val.startsWith('/'), {
    message: 'Must be an absolute URL or a path starting with "/"',
  });

// Monolingual + video-only support
const BodySchema = z
  .object({
    title: z.string().trim().min(1),
    excerpt: z.string().trim().optional(),
    content: z.string().trim().optional(),       // not required here
    categoryId: z.string().trim().optional(),    // conditionally required
    coverUrl: urlOrAppPath.optional(),
    heroImageUrl: urlOrAppPath.optional(),
    videoUrl: urlOrAppPath.optional(),
    videoOnly: z.boolean().optional(),
    isVideoOnly: z.boolean().optional(),
    readingTime: z.union([z.number().int().nonnegative(), z.string().trim().min(1)]).optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((data, ctx) => {
    const isVideo = (data.videoOnly ?? data.isVideoOnly) === true;

    if (isVideo) {
      // video-only: require videoUrl; no need for content/categoryId
      if (!data.videoUrl) {
        ctx.addIssue({
          path: ['videoUrl'],
          code: z.ZodIssueCode.custom,
          message: 'videoUrl is required when videoOnly is true',
        });
      }
    } else {
      // text: require non-empty content and categoryId
      const c = (data.content ?? '').replace(/<[^>]+>/g, '').trim();
      if (!c) {
        ctx.addIssue({
          path: ['content'],
          code: z.ZodIssueCode.custom,
          message: 'content is required when videoOnly is false',
        });
      }
      if (!data.categoryId || data.categoryId.trim() === '') {
        ctx.addIssue({
          path: ['categoryId'],
          code: z.ZodIssueCode.custom,
          message: 'categoryId is required when videoOnly is false',
        });
      }
    }
  });

type Body = z.infer<typeof BodySchema>;

/* -------------------------------- Helpers ------------------------------ */

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
  const user = (session as Record<string, unknown>)['user'];
  if (!isObject(user)) return false;
  const role = (user as Record<string, unknown>)['role'];
  return role === 'admin';
}

function responseError(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function toPlainStringReadingTime(rt?: Body['readingTime']): string | undefined {
  if (rt === undefined) return undefined;
  return typeof rt === 'number' ? String(rt) : rt;
}

function computeReadingTimeFromHtml(html?: string) {
  if (!html) return undefined;
  const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

/* --------------------------------- GET --------------------------------- */

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;

  const session = await getServerSession(authOptions);
  if (!requireAdmin(session)) return responseError('Unauthorized', 401);
  if (!slug) return responseError('Slug missing', 400);

  try {
    const db = (await clientPromise).db();
    const article = await db.collection<ArticleDocDb>('articles').findOne({ slug });

    if (!article) return responseError('Article not found', 404);

    const flag = article.videoOnly ?? article.isVideoOnly ?? false;
    const out: ArticleDocApi = { ...article, videoOnly: flag, isVideoOnly: flag, _id: article._id.toString() };
    return NextResponse.json(out, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch article:', error);
    return responseError('Internal Server Error', 500);
  }
}

/* --------------------------------- PUT --------------------------------- */

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;

  const session = await getServerSession(authOptions);
  if (!requireAdmin(session)) return responseError('Unauthorized', 401);
  if (!slug) return responseError('Slug missing', 400);

  let data: Body;
  try {
    data = BodySchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      {
        error: 'Invalid JSON or body',
        details: e instanceof z.ZodError ? e.flatten() : undefined,
      },
      { status: 400 },
    );
  }

  try {
    const db = (await clientPromise).db();
    const articles = db.collection<ArticleDocDb>('articles');

    const unifiedCover = data.coverUrl ?? data.heroImageUrl;
    const isVideo = (data.videoOnly ?? data.isVideoOnly) === true;

    // build $set
    const set: Partial<ArticleDocDb> = {
      title: data.title,
      updatedAt: new Date(),
      status: 'published',
      videoOnly: isVideo,
      isVideoOnly: isVideo,
    };

    if (data.excerpt !== undefined) set.excerpt = data.excerpt || undefined;
    if (data.content !== undefined) set.content = data.content || undefined;
    if (data.videoUrl !== undefined) set.videoUrl = data.videoUrl || undefined;
    if (data.meta !== undefined) set.meta = data.meta as Record<string, unknown>;

    // readingTime: only keep/compute for text posts
    const rt = toPlainStringReadingTime(data.readingTime);
    if (!isVideo) {
      if (rt !== undefined) {
        set.readingTime = rt;
      } else if (data.content) {
        const computed = computeReadingTimeFromHtml(data.content);
        if (computed) set.readingTime = computed;
      }
    }

    // categoryId: allow clearing via "", and remove entirely for video-only if not provided
    if (data.categoryId !== undefined) {
      const cat = data.categoryId.trim();
      set.categoryId = cat === '' ? undefined : cat;
    }

    if (unifiedCover !== undefined) {
      set.coverUrl = unifiedCover;
      set.heroImageUrl = unifiedCover; // legacy mirror
    }

    // $unset for cleanup when switching to video-only
    const unset: Record<string, ''> = {};
    if (isVideo) {
      if (data.categoryId === undefined || data.categoryId.trim() === '') unset.categoryId = '';
      if (!data.content || data.content.trim() === '') {
        unset.content = '';
        unset.readingTime = '';
      }
    }

    const updateResult = await articles.findOneAndUpdate(
      { slug },
      { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { returnDocument: 'after' },
    );

    const updated = updateResult.value;
    if (!updated) return responseError('Article not found', 404);

    const flag = updated.videoOnly ?? updated.isVideoOnly ?? false;
    const out: ArticleDocApi = { ...updated, videoOnly: flag, isVideoOnly: flag, _id: updated._id.toString() };

    return NextResponse.json(
      { message: 'Article updated successfully', article: out },
      { status: 200 },
    );
  } catch (error) {
    console.error('Failed to update article:', error);
    return responseError('Failed to update article', 500);
  }
}
