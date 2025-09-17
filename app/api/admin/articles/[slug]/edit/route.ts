// app/api/admin/articles/[slug]/edit/route.ts  (أو مسارك المكافئ)
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/types/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { z } from 'zod';

// في Dynamic API Routes، Next.js يمرّر params كـ Promise
type Ctx = { params: Promise<{ slug: string }> };

// نقبل URL مطلق أو مسار يبدأ بـ /
const urlOrAppPath = z
  .string()
  .min(1)
  .refine((val) => /^https?:\/\//.test(val) || val.startsWith('/'), {
    message: 'Must be an absolute URL or a path starting with "/"',
  });

// ✅ بدون page وبدون status
const BodySchema = z.object({
  title: z.string().min(1),
  excerpt: z.string().optional(),
  content: z.string().min(1),
  categoryId: z.string().optional(),
  coverUrl: urlOrAppPath.optional(),
  heroImageUrl: urlOrAppPath.optional(),
  videoUrl: urlOrAppPath.optional(),
  readingTime: z.number().int().nonnegative().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});
type Body = z.infer<typeof BodySchema>;

/* -------------------------------- GET -------------------------------- */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;

  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!slug) {
    return NextResponse.json({ error: 'Slug missing' }, { status: 400 });
  }

  try {
    const db = (await clientPromise).db();
    const article = await db.collection('articles').findOne({ slug });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error('Failed to fetch article:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/* -------------------------------- PUT -------------------------------- */
// ينشر مباشرة: status='published' دائماً عند الحفظ
export async function PUT(req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;

  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!slug) {
    return NextResponse.json({ error: 'Slug missing' }, { status: 400 });
  }

  let data: Body;
  try {
    const json = await req.json();
    data = BodySchema.parse(json);
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
    const articles = db.collection('articles');

    // نبني $set بدون undefined
    const setEntries: [string, unknown][] = [
      ['title', data.title],
      ['excerpt', data.excerpt],
      ['content', data.content],
      ['categoryId', data.categoryId],
      ['videoUrl', data.videoUrl],
      ['readingTime', data.readingTime],
      ['meta', data.meta],
      ['updatedAt', new Date()],
      // ✅ ننشر دائمًا
      ['status', 'published'],
    ].filter(([, v]) => v !== undefined) as [string, unknown][];

    // توحيد coverUrl و heroImageUrl
    const cover = data.coverUrl ?? data.heroImageUrl;
    if (cover !== undefined) {
      setEntries.push(['coverUrl', cover], ['heroImageUrl', cover]);
    }

    const set = Object.fromEntries(setEntries);

    const updateResult = await articles.updateOne({ slug }, { $set: set });

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Article updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to update article:', error);
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
  }
}
