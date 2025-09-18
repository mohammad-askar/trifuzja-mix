// 📁 app/api/admin/categories/[id]/route.ts
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
// ✅ أحادي اللغة: اسم واحد فقط
const UpdateSchema = z.object({
  name: z.string().trim().min(2, 'name must be at least 2 characters'),
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
    const res = await db.collection('categories').deleteOne({ _id: new ObjectId(id) });

    if (res.deletedCount === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // لا حاجة لمحتوى في الجسم عند الحذف
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

    // ✅ تحقق من الجسم: اسم واحد فقط
    const bodyUnknown = await req.json();
    const { name } = UpdateSchema.parse(bodyUnknown);

    // ننشئ slug من الاسم الواحد
    const slug = slugify(name, { lower: true, strict: true });
    const now = new Date();

    const db = (await clientPromise).db();

    // ✅ فحص تكرار slug عالميًا
    const dup = await db
      .collection('categories')
      .findOne({ slug, _id: { $ne: new ObjectId(id) } });

    if (dup) {
      return NextResponse.json({ error: 'Slug exists' }, { status: 409 });
    }

    // ✅ نخزّن الحقول الأحادية فقط: name (string) و slug
    const updateResult = await db.collection('categories').findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          slug,
          name,           // ← اسم واحد كسلسلة
          updatedAt: now,
        },
        // تنظيف اختياري لهيكل قديم (إن وُجد) بلا كسر للخلفية:
        $unset: { 'name.en': '', 'name.pl': '' },
      },
      { returnDocument: 'after' },
    );

    if (!updateResult.value) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const updated = updateResult.value as {
      _id: ObjectId;
      name: string;
      slug: string;
      updatedAt?: Date;
      [k: string]: unknown;
    };

    return NextResponse.json({
      ...updated,
      _id: updated._id.toString(),
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
