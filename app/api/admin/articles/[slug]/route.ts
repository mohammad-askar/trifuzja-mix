// 📁 app/api/admin/articles/[slug]/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/types/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { z, ZodError } from 'zod';

/* ------------------------------------------------------------------ */
/*                           Helpers & Schema                         */
/* ------------------------------------------------------------------ */

// في App Router قد يأتي params كـ Promise — ننتظره دائماً
type Ctx = { params: Promise<{ slug: string }> };

// URL مطلق http/https أو مسار يبدأ بـ /
const relativeOrAbsoluteUrl = z
  .string()
  .min(1)
  .refine((v) => v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/'), {
    message: 'Invalid URL',
  });

// ✅ لا page ولا status هنا
const UpsertSchema = z.object({
  title: z.record(z.string(), z.string()),
  excerpt: z.record(z.string(), z.string()).optional(),
  content: z.record(z.string(), z.string()).optional(),
  categoryId: z.string().min(1, 'categoryId is required'),
  coverUrl: relativeOrAbsoluteUrl.optional(),
  heroImageUrl: relativeOrAbsoluteUrl.optional(), // للتوافقية
  videoUrl: relativeOrAbsoluteUrl.optional(),
  readingTime: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

function normalizeSlug(raw: string) {
  const slug = raw.trim().toLowerCase();
  if (!/^[a-z0-9-]{3,}$/.test(slug)) throw new Error('Invalid slug');
  return slug;
}

function computeReadingTimeFromHtml(html?: string) {
  if (!html) return undefined;
  const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

const responseError = (msg: string, status = 400) =>
  NextResponse.json({ error: msg }, { status });

/* ------------------------------------------------------------------ */
/*                               GET                                  */
/* ------------------------------------------------------------------ */

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { slug: rawSlug } = await ctx.params;
  const session = await getServerSession(authOptions);
  if (!session) return responseError('Unauthorized', 401);
  if (session.user?.role !== 'admin') return responseError('Forbidden', 403);

  try {
    const slug = normalizeSlug(rawSlug);
    const db = (await clientPromise).db();
    const article = await db.collection('articles').findOne({ slug });
    if (!article) return responseError('Not found', 404);
    return NextResponse.json(article);
  } catch (e) {
    if ((e as Error).message === 'Invalid slug') return responseError('Invalid slug', 400);
    console.error('GET /api/admin/articles/[slug] error:', e);
    return responseError('Internal Server Error', 500);
  }
}

/* ------------------------------------------------------------------ */
/*                               PUT (Upsert)                         */
/* ------------------------------------------------------------------ */

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { slug: rawSlug } = await ctx.params;
  const session = await getServerSession(authOptions);
  if (!session) return responseError('Unauthorized', 401);
  if (session.user?.role !== 'admin') return responseError('Forbidden', 403);

  try {
    const slug = normalizeSlug(rawSlug);
    const body = UpsertSchema.parse(await req.json());

    // وقت القراءة (من أول لغة متاحة)
    let readingTime = body.readingTime;
    if (body.content) {
      const firstHtml = Object.values(body.content)[0] || '';
      readingTime = computeReadingTimeFromHtml(firstHtml) ?? readingTime;
    }

    const now = new Date();
    const db = (await clientPromise).db();
    const coll = db.collection('articles');

    const cover = body.coverUrl ?? body.heroImageUrl;

    // ✅ نبني $set مرة واحدة — ونضع status: 'published' هنا فقط
    const setEntries: [string, unknown][] = [
      ['title', body.title],
      ['excerpt', body.excerpt],
      ['content', body.content],
      ['categoryId', body.categoryId],
      ['videoUrl', body.videoUrl],
      ['meta', body.meta],
      ['slug', slug],
      ['updatedAt', now],
      ['status', 'published'], // ← نشر دائمًا عند الحفظ/الإنشاء
    ].filter(([, v]) => v !== undefined) as [string, unknown][];

    if (readingTime) setEntries.push(['readingTime', readingTime]);
    if (cover) setEntries.push(['coverUrl', cover], ['heroImageUrl', cover]);

    const set = Object.fromEntries(setEntries);

    const res = await coll.updateOne(
      { slug },
      {
        $set: set,
        // لا نكرّر status هنا لتجنب أي تضارب
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
    if ((e as Error).message === 'Invalid slug') return responseError('Invalid slug', 400);
    console.error('PUT /api/admin/articles/[slug] error:', e);
    return responseError('Internal Server Error', 500);
  }
}

/* ------------------------------------------------------------------ */
/*                               DELETE                               */
/* ------------------------------------------------------------------ */

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { slug: rawSlug } = await ctx.params;
  const session = await getServerSession(authOptions);
  if (!session) return responseError('Unauthorized', 401);
  if (session.user?.role !== 'admin') return responseError('Forbidden', 403);

  try {
    const slug = normalizeSlug(rawSlug);
    const db = (await clientPromise).db();
    const res = await db.collection('articles').deleteOne({ slug });
    if (res.deletedCount === 0) return responseError('Not found', 404);
    return NextResponse.json({ ok: true, slug });
  } catch (e) {
    if ((e as Error).message === 'Invalid slug') return responseError('Invalid slug', 400);
    console.error('DELETE /api/admin/articles/[slug] error:', e);
    return responseError('Internal Server Error', 500);
  }
}
