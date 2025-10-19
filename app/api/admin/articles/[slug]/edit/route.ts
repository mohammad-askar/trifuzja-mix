//E:\trifuzja-mix\app\api\admin\articles\[slug]\edit\route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/types/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { z } from 'zod';
import type { ObjectId, Collection } from 'mongodb';

/* -------------------------------- Types -------------------------------- */

type Ctx = { params: Promise<{ slug: string }> };

interface ArticleDocDb {
  _id: ObjectId;
  slug: string;
  title: string;
  excerpt?: string;
  content?: string;
  categoryId?: string;
  coverUrl?: string;
  heroImageUrl?: string;
  videoUrl?: string;
  videoOnly?: boolean;
  isVideoOnly?: boolean;
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

const urlOrAppPath = z
  .string()
  .min(1)
  .refine((val) => /^https?:\/\//.test(val) || val.startsWith('/'), {
    message: 'Must be an absolute URL or a path starting with "/"',
  });

const BodySchema = z
  .object({
    title: z.string().trim().min(1),
    excerpt: z.string().trim().optional(),
    content: z.string().trim().optional(),
    categoryId: z.string().trim().optional(),
    coverUrl: urlOrAppPath.optional(),
    heroImageUrl: urlOrAppPath.optional(),
    videoUrl: urlOrAppPath.optional(),
    videoOnly: z.boolean().optional(),
    isVideoOnly: z.boolean().optional(),
    readingTime: z.union([z.number().int().nonnegative(), z.string().trim().min(1)]).optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
    preserveSlug: z.boolean().optional(), // 👈 NEW
  })
  .superRefine((data, ctx) => {
    const isVideo = (data.videoOnly ?? data.isVideoOnly) === true;
    if (isVideo) {
      if (!data.videoUrl) {
        ctx.addIssue({ path: ['videoUrl'], code: z.ZodIssueCode.custom, message: 'videoUrl is required when videoOnly is true' });
      }
    } else {
      const c = (data.content ?? '').replace(/<[^>]+>/g, '').trim();
      if (!c) ctx.addIssue({ path: ['content'], code: z.ZodIssueCode.custom, message: 'content is required when videoOnly is false' });
      if (!data.categoryId || data.categoryId.trim() === '') {
        ctx.addIssue({ path: ['categoryId'], code: z.ZodIssueCode.custom, message: 'categoryId is required when videoOnly is false' });
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

function requireAdmin(session: unknown): session is AdminSessionShape & { user: { role: string } } {
  if (!isObject(session)) return false;
  const user = (session as Record<string, unknown>).user;
  if (!isObject(user)) return false;
  return (user as Record<string, unknown>).role === 'admin';
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

function makeSlug(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

async function ensureUniqueSlug(
  base: string,
  selfId: ObjectId,
  coll: Collection<ArticleDocDb>,
): Promise<string> {
  const clean = base || 'post';
  let candidate = clean;
  let i = 2;
  while (i < 2000) {
    const exists = await coll.findOne({ slug: candidate, _id: { $ne: selfId } }, { projection: { _id: 1 } });
    if (!exists) return candidate;
    candidate = `${clean}-${i++}`;
  }
  throw new Error('Slug collision loop');
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
      { error: 'Invalid JSON or body', details: e instanceof z.ZodError ? e.flatten() : undefined },
      { status: 400 },
    );
  }

  try {
    const db = (await clientPromise).db();
    const articles = db.collection<ArticleDocDb>('articles');

    const current = await articles.findOne({ slug }, { projection: { _id: 1, slug: 1 } });
    if (!current) return responseError('Article not found', 404);

    const unifiedCover = data.coverUrl ?? data.heroImageUrl;
    const isVideo = (data.videoOnly ?? data.isVideoOnly) === true;

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

    const rt = toPlainStringReadingTime(data.readingTime);
    if (!isVideo) {
      if (rt !== undefined) set.readingTime = rt;
      else if (data.content) {
        const computed = computeReadingTimeFromHtml(data.content);
        if (computed) set.readingTime = computed;
      }
    }

    if (data.categoryId !== undefined) {
      const cat = data.categoryId.trim();
      set.categoryId = cat === '' ? undefined : cat;
    }

    if (unifiedCover !== undefined) {
      set.coverUrl = unifiedCover;
      set.heroImageUrl = unifiedCover;
    }

    const desiredBase = makeSlug(data.title);
    const preserve = data.preserveSlug === true;
    let finalSlug = slug;
    if (!preserve && desiredBase && desiredBase !== slug) {
      finalSlug = await ensureUniqueSlug(desiredBase, current._id, articles);
      set.slug = finalSlug;
    }

    const unset: Record<string, ''> = {};
    if (isVideo) {
      if (data.categoryId === undefined || data.categoryId.trim() === '') unset.categoryId = '';
      if (!data.content || data.content.trim() === '') {
        unset.content = '';
        unset.readingTime = '';
      }
    }

    const updateResult = await articles.findOneAndUpdate(
      { _id: current._id },
      { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { returnDocument: 'after' },
    );

    const updated = updateResult.value;
    if (!updated) return responseError('Article not found', 404);

    const flag = updated.videoOnly ?? updated.isVideoOnly ?? false;
    const out: ArticleDocApi = {
      ...updated,
      videoOnly: flag,
      isVideoOnly: flag,
      _id: updated._id.toString(),
    };

    return NextResponse.json(
      {
        message: 'Article updated successfully',
        article: out,
        slugChanged: finalSlug !== slug,
        newSlug: finalSlug,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Failed to update article:', error);
    return responseError('Failed to update article', 500);
  }
}
