//E:\trifuzja-mix\app\api\admin\articles\[slug]\route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/types/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { z, ZodError } from 'zod';
import type { ObjectId, Collection, WithId } from 'mongodb';

/* ----------------------------- Types/Helpers ---------------------------- */

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

interface ArticleDocApi extends Omit<ArticleDocDb, '_id'> { _id: string }

type AdminSessionShape = { user?: { role?: string | null } | null } | null | undefined;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
function requireAdmin(session: unknown): session is AdminSessionShape & { user: { role: string } } {
  if (!isObject(session)) return false;
  const u = (session as Record<string, unknown>).user;
  return isObject(u) && (u as Record<string, unknown>).role === 'admin';
}
function responseError(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

const urlSchema = z.string().trim().min(1).refine(
  (v) => v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/'),
  { message: 'Invalid URL' },
);

// body schema:
const UpsertSchema = z.object({
  title: z.string().trim().min(1),
  excerpt: z.string().trim().optional(),
  content: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  coverUrl: urlSchema.optional(),
  heroImageUrl: urlSchema.optional(),
  videoUrl: urlSchema.optional(),
  videoOnly: z.boolean().optional(),
  isVideoOnly: z.boolean().optional(),
  readingTime: z.union([z.number().int().nonnegative(), z.string().trim().min(1)]).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  preserveSlug: z.boolean().optional(), // 👈 NEW
}).superRefine((data, ctx) => {
  const isVideo = (data.videoOnly ?? data.isVideoOnly) === true;
  if (isVideo) {
    if (!data.videoUrl) ctx.addIssue({ path: ['videoUrl'], code: z.ZodIssueCode.custom, message: 'videoUrl is required when videoOnly is true' });
  } else {
    const c = (data.content ?? '').replace(/<[^>]+>/g, '').trim();
    if (!c) ctx.addIssue({ path: ['content'], code: z.ZodIssueCode.custom, message: 'content is required when videoOnly is false' });
    if (!data.categoryId) ctx.addIssue({ path: ['categoryId'], code: z.ZodIssueCode.custom, message: 'categoryId is required when videoOnly is false' });
  }
});

function computeReadingTimeFromHtml(html?: string) {
  if (!html) return undefined;
  const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}
function toPlainStringReadingTime(rt?: number | string): string | undefined {
  if (rt === undefined) return undefined;
  return typeof rt === 'number' ? String(rt) : rt;
}
function pruneUndefined<T extends Record<string, unknown>>(obj: T): T {
  for (const k of Object.keys(obj)) if (obj[k] === undefined) delete obj[k];
  return obj;
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

async function ensureUniqueSlugForEdit(
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
  throw new Error('Slug collision loop (edit)');
}

async function ensureUniqueSlugForCreate(
  base: string,
  coll: Collection<ArticleDocDb>,
): Promise<string> {
  const clean = base || 'post';
  let candidate = clean;
  let i = 2;
  while (i < 2000) {
    const exists = await coll.findOne({ slug: candidate }, { projection: { _id: 1 } });
    if (!exists) return candidate;
    candidate = `${clean}-${i++}`;
  }
  throw new Error('Slug collision loop (create)');
}

function toApi(doc: WithId<ArticleDocDb>): ArticleDocApi {
  const flag = doc.videoOnly ?? doc.isVideoOnly ?? false;
  return { ...doc, videoOnly: flag, isVideoOnly: flag, _id: doc._id.toString() };
}

/* ---------------------------------- GET --------------------------------- */

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const session = await getServerSession(authOptions);
  if (!requireAdmin(session)) return responseError('Unauthorized', 401);

  try {
    const db = (await clientPromise).db();
    const article = await db.collection<ArticleDocDb>('articles').findOne({ slug });
    if (!article) return responseError('Not found', 404);
    return NextResponse.json(toApi({ ...article, _id: article._id }), { status: 200 });
  } catch (e) {
    console.error('GET /api/admin/articles/[slug] error:', e);
    return responseError('Internal Server Error', 500);
  }
}

/* ---------------------------------- PUT --------------------------------- */

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { slug: currentSlug } = await ctx.params;
  const session = await getServerSession(authOptions);
  if (!requireAdmin(session)) return responseError('Unauthorized', 401);

  let body: z.infer<typeof UpsertSchema>;
  try {
    body = UpsertSchema.parse(await req.json());
  } catch (e) {
    return responseError(e instanceof ZodError ? e.issues.map(i => i.message).join(' | ') : 'Invalid body', 400);
  }

  try {
    const db = (await clientPromise).db();
    const coll = db.collection<ArticleDocDb>('articles');

    const current = await coll.findOne({ slug: currentSlug }, { projection: { _id: 1, slug: 1 } });

    const isVideo = (body.videoOnly ?? body.isVideoOnly) === true;
    let readingTime = toPlainStringReadingTime(body.readingTime);
    if (!isVideo && !readingTime && body.content) {
      readingTime = computeReadingTimeFromHtml(body.content);
    }
    const cover = body.coverUrl ?? body.heroImageUrl;
    const desiredBase = makeSlug(body.title);

    /* ------------------------------- EDIT FLOW ------------------------------ */
    if (current) {
      const preserve = body.preserveSlug === true;
      let finalSlug = current.slug;
      if (!preserve && desiredBase && desiredBase !== current.slug) {
        finalSlug = await ensureUniqueSlugForEdit(desiredBase, current._id, coll);
      }

      const unset: Record<string, ''> = {};
      if (isVideo) {
        if (!body.categoryId || body.categoryId === '') unset.categoryId = '';
        if (!body.content || body.content.trim() === '') {
          unset.content = '';
          unset.readingTime = '';
        }
      }

      const setRaw: Partial<ArticleDocDb> = {
        slug: finalSlug,
        title: body.title,
        excerpt: body.excerpt,
        content: body.content,
        categoryId: body.categoryId && body.categoryId !== '' ? body.categoryId : undefined,
        coverUrl: cover,
        heroImageUrl: cover,
        videoUrl: body.videoUrl,
        videoOnly: isVideo,
        isVideoOnly: isVideo,
        readingTime,
        meta: body.meta as Record<string, unknown> | undefined,
        status: 'published',
        updatedAt: new Date(),
      };
      const setClean = pruneUndefined(setRaw);
      for (const k of Object.keys(unset)) delete (setClean as Record<string, unknown>)[k];

      const result = await coll.findOneAndUpdate(
        { _id: current._id },
        { $set: setClean, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
        { returnDocument: 'after' },
      );
      const updated = result.value;
      if (!updated) return responseError('Not found', 404);

      return NextResponse.json(
        { ok: true, article: toApi(updated), slugChanged: finalSlug !== current.slug, newSlug: finalSlug },
        { status: 200 },
      );
    }

    /* ------------------------------ CREATE FLOW ----------------------------- */
    const base = desiredBase || makeSlug(currentSlug) || 'post';
    const finalSlug = await ensureUniqueSlugForCreate(base, coll);

    const newDoc: Omit<ArticleDocDb, '_id'> = {
      slug: finalSlug,
      title: body.title,
      excerpt: body.excerpt,
      content: body.content,
      categoryId: body.categoryId && body.categoryId !== '' ? body.categoryId : undefined,
      coverUrl: cover,
      heroImageUrl: cover,
      videoUrl: body.videoUrl,
      videoOnly: isVideo,
      isVideoOnly: isVideo,
      readingTime,
      meta: body.meta as Record<string, unknown> | undefined,
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const cleanToInsert = pruneUndefined({ ...newDoc });
    const insertRes = await coll.insertOne(cleanToInsert as ArticleDocDb);
    const inserted = await coll.findOne({ _id: insertRes.insertedId });
    if (!inserted) return responseError('Insert failed', 500);

    return NextResponse.json(
      { ok: true, article: toApi(inserted), slugChanged: finalSlug !== currentSlug, newSlug: finalSlug, created: true },
      { status: 201 },
    );
  } catch (e) {
    console.error('PUT /api/admin/articles/[slug] error:', e);
    return responseError('Internal Server Error', 500);
  }
}

/* -------------------------------- DELETE -------------------------------- */

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const session = await getServerSession(authOptions);
  if (!requireAdmin(session)) return responseError('Unauthorized', 401);

  try {
    const db = (await clientPromise).db();
    const res = await db.collection<ArticleDocDb>('articles').deleteOne({ slug });
    if (res.deletedCount === 0) return responseError('Not found', 404);
    return NextResponse.json({ ok: true, slug }, { status: 200 });
  } catch (e) {
    console.error('DELETE /api/admin/articles/[slug] error:', e);
    return responseError('Internal Server Error', 500);
  }
}
