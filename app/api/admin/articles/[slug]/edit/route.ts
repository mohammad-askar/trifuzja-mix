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
  content: string;
  categoryId?: string;
  coverUrl?: string;
  heroImageUrl?: string; // توافقية قديمة
  videoUrl?: string;
  status?: 'published';   // لا نستخدم draft
  createdAt?: Date;
  updatedAt: Date;
  readingTime?: string;
  meta?: Record<string, unknown>;
}

interface ArticleDocApi extends Omit<ArticleDocDb, '_id'> {
  _id: string;
}

/* ------------------------------- Schemas ------------------------------- */

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
  categoryId: z.string().min(1).optional(),
  coverUrl: urlOrAppPath.optional(),
  heroImageUrl: urlOrAppPath.optional(),
  videoUrl: urlOrAppPath.optional(),
  // نقبل رقمًا أو نصًا ونخزّنه كنص
  readingTime: z.union([z.number().int().nonnegative(), z.string().min(1)]).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});
type Body = z.infer<typeof BodySchema>;

/* -------------------------------- Helpers ------------------------------ */

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

function responseError(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function toPlainStringReadingTime(rt?: Body['readingTime']): string | undefined {
  if (rt === undefined) return undefined;
  return typeof rt === 'number' ? String(rt) : rt;
}

/* --------------------------------- GET --------------------------------- */

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;

  const session = await getServerSession(authOptions);
  if (!requireAdmin(session)) {
    return responseError('Unauthorized', 401);
  }
  if (!slug) {
    return responseError('Slug missing', 400);
  }

  try {
    const db = (await clientPromise).db();
    const article = await db
      .collection<ArticleDocDb>('articles')
      .findOne({ slug });

    if (!article) {
      return responseError('Article not found', 404);
    }

    const out: ArticleDocApi = { ...article, _id: article._id.toString() };
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
  if (!requireAdmin(session)) {
    return responseError('Unauthorized', 401);
  }
  if (!slug) {
    return responseError('Slug missing', 400);
  }

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

    // نبني $set بدون undefined — ونضمن النشر دائمًا
    const set: Partial<ArticleDocDb> = {
      title: data.title,
      content: data.content,
      updatedAt: new Date(),
      status: 'published', // ننشر دائمًا
    };

    if (data.excerpt !== undefined) set.excerpt = data.excerpt;
    if (data.categoryId !== undefined) set.categoryId = data.categoryId;
    if (data.videoUrl !== undefined) set.videoUrl = data.videoUrl;
    if (data.meta !== undefined) set.meta = data.meta as Record<string, unknown>;

    const rt = toPlainStringReadingTime(data.readingTime);
    if (rt !== undefined) set.readingTime = rt;

    if (unifiedCover !== undefined) {
      set.coverUrl = unifiedCover;
      set.heroImageUrl = unifiedCover; // إبقاء الحقل للتوافق
    }

    // نعيد الوثيقة المعدلة مباشرةً بدون جلب ثانٍ
    const updateResult = await articles.findOneAndUpdate(
      { slug },
      { $set: set },
      { returnDocument: 'after' },
    );

    const updated = updateResult.value;
    if (!updated) {
      return responseError('Article not found', 404);
    }

    const out: ArticleDocApi = { ...updated, _id: updated._id.toString() };

    return NextResponse.json(
      { message: 'Article updated successfully', article: out },
      { status: 200 },
    );
  } catch (error) {
    console.error('Failed to update article:', error);
    return responseError('Failed to update article', 500);
  }
}
