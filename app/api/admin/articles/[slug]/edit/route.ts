// app/api/admin/articles/[slug]/edit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/types/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { z } from 'zod';

/** Next يمرّر params كـ Promise في Route Handlers */
type Ctx = { params: Promise<{ slug: string }> };

/** مسار مطلق أو يبدأ بـ / */
const urlOrAppPath = z
  .string()
  .min(1)
  .refine((val) => /^https?:\/\//.test(val) || val.startsWith('/'), {
    message: 'Must be an absolute URL or a path starting with "/"',
  });

/** حمولة حفظ المقال — حقول مسطّحة (بولندية فقط) */
const BodySchema = z.object({
  title: z.string().min(1),
  excerpt: z.string().optional(),
  content: z.string().min(1),
  categoryId: z.string().optional(),
  coverUrl: urlOrAppPath.optional(),
  heroImageUrl: urlOrAppPath.optional(),
  videoUrl: urlOrAppPath.optional(),
  // نقبل رقمًا أو نصًا ونخزّنه كنص
  readingTime: z.union([z.number().int().nonnegative(), z.string().min(1)]).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});
type Body = z.infer<typeof BodySchema>;

type AdminSessionShape =
  | {
      user?: { role?: string | null } | null;
    }
  | null
  | undefined;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** حارس نوعي بدون any */
function requireAdmin(session: unknown): session is AdminSessionShape & {
  user: { role: string };
} {
  if (!isObject(session)) return false;
  const user = (session as Record<string, unknown>)['user'];
  if (!isObject(user)) return false;
  const role = (user as Record<string, unknown>)['role'];
  return role === 'admin';
}

function toPlainStringReadingTime(rt?: Body['readingTime']): string | undefined {
  if (rt === undefined) return undefined;
  return typeof rt === 'number' ? String(rt) : rt;
}

/* -------------------------------- GET -------------------------------- */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;

  const session = await getServerSession(authOptions);
  if (!requireAdmin(session)) {
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

    return NextResponse.json(article, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch article:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/* -------------------------------- PUT -------------------------------- */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;

  const session = await getServerSession(authOptions);
  if (!requireAdmin(session)) {
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

    const unifiedCover = data.coverUrl ?? data.heroImageUrl;

    // نبني $set بدون undefined
    const set: Record<string, unknown> = {
      title: data.title,
      content: data.content,
      updatedAt: new Date(),
      status: 'published', // ننشر دائمًا
    };
    if (data.excerpt !== undefined) set.excerpt = data.excerpt;
    if (data.categoryId !== undefined) set.categoryId = data.categoryId;
    if (data.videoUrl !== undefined) set.videoUrl = data.videoUrl;
    if (data.meta !== undefined) set.meta = data.meta;

    const rt = toPlainStringReadingTime(data.readingTime);
    if (rt !== undefined) set.readingTime = rt;

    if (unifiedCover !== undefined) {
      set.coverUrl = unifiedCover;
      set.heroImageUrl = unifiedCover;
    }

    const updateResult = await articles.updateOne({ slug }, { $set: set });
    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const updated = await articles.findOne({ slug });
    return NextResponse.json(
      { message: 'Article updated successfully', article: updated },
      { status: 200 },
    );
  } catch (error) {
    console.error('Failed to update article:', error);
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
  }
}
