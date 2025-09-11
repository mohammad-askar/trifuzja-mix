// E:\trifuzja-mix\app\api\admin\articles\[slug]\route.ts
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/types/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// سياق الراوت: params كـ Promise
type Ctx = { params: Promise<{ slug: string }> };

// مثال GET
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params; // ✅ لازم await
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = (await clientPromise).db();
    const article = await db.collection('articles').findOne({ slug });
    if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(article);
  } catch (e) {
    console.error('GET /api/admin/articles/[slug] error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// إن كان لديك طرق أخرى في نفس الملف (PUT/POST/PATCH/DELETE) غيّر توقيعها بنفس النمط:
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const db = (await clientPromise).db();
    const res = await db.collection('articles').deleteOne({ slug });
    if (res.deletedCount === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/admin/articles/[slug] error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
