// 📁 app/api/admin/articles/[slug]/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/types/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { z, ZodError } from 'zod';
import { PAGES, PageKey } from '@/types/constants/pages';

/* ------------------------------------------------------------------ */
/*                           Helpers & Schema                         */
/* ------------------------------------------------------------------ */

// ⚠️ في App Router قد يأتي params كـ Promise في بعض البيئات
type Ctx = { params: Promise<{ slug: string }> };

const pageEnum = z.enum(PAGES.map(p => p.key) as [PageKey, ...PageKey[]]);

// نسمح بروابط مطلقة http/https أو مسار مرفوع داخلي يبدأ بـ /uploads/
const relativeOrAbsoluteUrl = z.string().refine(
  (v) =>
    !v ||
    v.startsWith('http://') ||
    v.startsWith('https://') ||
    v.startsWith('/uploads/'),
  'Invalid URL'
);

// Body schema لعملية upsert (إنشاء أو تحديث)
const UpsertSchema = z.object({
  // ترجمات: { en: "...", pl: "..." } يمكن الاكتفاء بلغة واحدة
  title: z.record(z.string(), z.string()),
  excerpt: z.record(z.string(), z.string()).optional(),
  content: z.record(z.string(), z.string()).optional(),
  page: pageEnum,
  categoryId: z.string().min(1, 'categoryId is required'),
  coverUrl: relativeOrAbsoluteUrl.optional(),
  videoUrl: relativeOrAbsoluteUrl.optional(),
  status: z.enum(['draft', 'published']),
  // يمكنك تمريره من الواجهة؛ لكن سنعيد حسابه إن وصل content
  readingTime: z.string().optional(),
});

// توحيد/تحقّق slug القادم من params
function normalizeSlug(raw: string) {
  const slug = raw.trim().toLowerCase();
  // حروف صغيرة/أرقام وشرطة فقط، طول ≥ 3
  if (!/^[a-z0-9-]{3,}$/.test(slug)) {
    throw new Error('Invalid slug');
  }
  return slug;
}

// حساب وقت القراءة من HTML (تقريب 200 كلمة/دقيقة)
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

// رد خطأ موحّد
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
    if ((e as Error).message === 'Invalid slug') {
      return responseError('Invalid slug', 400);
    }
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

    // لو جاي محتوى، نحسب وقت القراءة من أول محتوى متاح
    let readingTime = body.readingTime;
    if (body.content) {
      const firstHtml = Object.values(body.content)[0] || '';
      readingTime = computeReadingTimeFromHtml(firstHtml) ?? readingTime;
    }

    const now = new Date();
    const db = (await clientPromise).db();
    const coll = db.collection('articles');

    const res = await coll.updateOne(
      { slug },
      {
        $set: {
          ...body,
          slug,
          updatedAt: now,
          ...(readingTime ? { readingTime } : {}),
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    const created = res.upsertedCount > 0;
    return NextResponse.json(
      { ok: true, slug, created },
      { status: created ? 201 : 200 }
    );
  } catch (e) {
    if (e instanceof ZodError) {
      return responseError(
        e.issues.map((i) => i.message).join(' | '),
        400
      );
    }
    if ((e as Error).message === 'Invalid slug') {
      return responseError('Invalid slug', 400);
    }
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
    if ((e as Error).message === 'Invalid slug') {
      return responseError('Invalid slug', 400);
    }
    console.error('DELETE /api/admin/articles/[slug] error:', e);
    return responseError('Internal Server Error', 500);
  }
}
