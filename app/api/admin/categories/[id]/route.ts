// E:\trifuzja-mix\app\api\admin\categories\[id]\route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/types/mongodb';
import { requireAdmin } from '@/types/auth';
import slugify from 'slugify';
import { z, ZodError } from 'zod';

/* ------------------------------- Types -------------------------------- */
type Ctx = { params: Promise<{ id: string }> };

/* ------------------------------ Schemas ------------------------------- */
// ✅ بدون page
const UpdateSchema = z.object({
  nameEn: z.string().min(2),
  namePl: z.string().min(2),
});

/* -------------------------------- DELETE ------------------------------ */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();

    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id format' }, { status: 400 });
    }

    const db = (await clientPromise).db();
    const res = await db
      .collection('categories')
      .deleteOne({ _id: new ObjectId(id) });

    if (res.deletedCount === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    const status =
      e instanceof Error && e.message === 'Unauthorized' ? 401 : 500;
    console.error('DELETE category error', e);
    return NextResponse.json({ error: 'Server error' }, { status });
  }
}

/* ---------------------------------- PUT ------------------------------- */
export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();

    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id format' }, { status: 400 });
    }

    // ✅ تحقق من الجسم بدون page
    const body = await req.json();
    const { nameEn, namePl } = UpdateSchema.parse(body);

    const slug = slugify(nameEn, { lower: true, strict: true });
    const now = new Date();

    const db = (await clientPromise).db();

    // ✅ فحص تكرار slug عالميًا (لا يعتمد على page)
    const dup = await db
      .collection('categories')
      .findOne({ slug, _id: { $ne: new ObjectId(id) } });

    if (dup) {
      return NextResponse.json({ error: 'Slug exists' }, { status: 409 });
    }

    const updateResult = await db.collection('categories').findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          slug,
          name: { en: nameEn, pl: namePl },
          updatedAt: now,
        },
      },
      { returnDocument: 'after' },
    );

    if (!updateResult.value) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const updated = updateResult.value;
    return NextResponse.json({
      ...updated,
      _id: (updated._id as ObjectId).toString(),
    });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        { error: e.issues.map((i) => i.message).join(' | ') },
        { status: 400 },
      );
    }
    const status =
      e instanceof Error && e.message === 'Unauthorized' ? 401 : 500;
    console.error('PUT category error', e);
    return NextResponse.json({ error: 'Server error' }, { status });
  }
}
