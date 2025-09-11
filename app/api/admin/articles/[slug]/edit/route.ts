// E:\trifuzja-mix\app\api\admin\articles\[slug]\edit\route.ts
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/types/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { z } from 'zod';
import type { PageKey, ArticleStatus } from '@/types/core/article';

// سياق الراوت: params كـ Promise
type Ctx = { params: Promise<{ slug: string }> };

// مخطط جسم الطلب (بدون any)
const BodySchema = z.object({
  title: z.string().min(1),
  excerpt: z.string().optional(),
  content: z.string().min(1),
  page: z.union([z.literal('multi'), z.literal('terra'), z.literal('daily')]).optional(), // PageKey
  categoryId: z.string().optional(),
  coverUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  status: z.union([
    z.literal('draft'),
    z.literal('review'),
    z.literal('scheduled'),
    z.literal('published'),
    z.literal('archived'),
  ]).optional(), // ArticleStatus
  readingTime: z.number().int().nonnegative().optional(),
});
type Body = z.infer<typeof BodySchema>;

// GET
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
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

// PUT
export async function PUT(req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!slug) {
    return NextResponse.json({ error: 'Slug missing' }, { status: 400 });
  }

  // ✅ قراءة الجسم كـ unknown ثم التحقق بـ Zod (لا any)
  let data: Body;
  try {
    const json = await req.json();              // النوع فعلياً unknown/any من DOM
    const parsed = BodySchema.parse(json);      // يضمن النوع الآمن
    data = parsed;
  } catch (e) {
    return NextResponse.json(
      { error: 'Invalid JSON or body', details: e instanceof z.ZodError ? e.flatten() : undefined },
      { status: 400 },
    );
  }

  try {
    const db = (await clientPromise).db();
    const articles = db.collection('articles');

    // (اختياري) إزالة الحقول undefined من $set
    const set = Object.fromEntries(
      Object.entries({
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        page: data.page as PageKey | undefined,
        categoryId: data.categoryId,
        coverUrl: data.coverUrl,
        videoUrl: data.videoUrl,
        status: data.status as ArticleStatus | undefined,
        readingTime: data.readingTime,
        updatedAt: new Date(),
      }).filter(([, v]) => v !== undefined),
    );

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
