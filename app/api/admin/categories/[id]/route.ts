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

interface CategoryDbDoc {
  _id: ObjectId;
  name: string | Record<string, unknown>;
  slug?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CategoryApiDoc {
  _id: string;
  name: string;
  slug?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/* ------------------------------ Schemas ------------------------------- */
const UpdateSchema = z.object({
  name: z.string().trim().min(2, 'name must be at least 2 characters'),
});

/* ------------------------------ Helpers ------------------------------- */
function responseError(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

/* -------------------------------- DELETE ------------------------------ */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();

    const { id } = await ctx.params; // ← لازم await
    if (!ObjectId.isValid(id)) return responseError('Invalid id format', 400);

    const db = (await clientPromise).db();
    const res = await db
      .collection<CategoryDbDoc>('categories')
      .deleteOne({ _id: new ObjectId(id) });

    if (res.deletedCount === 0) return responseError('Category not found', 404);

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    const status =
      e instanceof Error && e.message === 'Unauthorized' ? 401 : 500;
    console.error('DELETE category error', e);
    return responseError('Server error', status);
  }
}

/* ---------------------------------- PUT ------------------------------- */
export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();

    const { id } = await ctx.params; // ← لازم await
    if (!ObjectId.isValid(id)) return responseError('Invalid id format', 400);

    const bodyUnknown = await req.json();
    const { name } = UpdateSchema.parse(bodyUnknown);

    const slug = slugify(name, { lower: true, strict: true });
    const now = new Date();

    const db = (await clientPromise).db();
    const coll = db.collection<CategoryDbDoc>('categories');

    const dup = await coll.findOne({ slug, _id: { $ne: new ObjectId(id) } });
    if (dup) return responseError('Slug exists', 409);

    // فقط $set — لا تستخدم $unset لحقول فرعية داخل name لتجنب التضارب
    const updateResult = await coll.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { name, slug, updatedAt: now } },
      { returnDocument: 'after' },
    );

    const updated = updateResult.value;
    if (!updated) return responseError('Category not found', 404);

    const out: CategoryApiDoc = {
      _id: updated._id.toString(),
      name: typeof updated.name === 'string' ? updated.name : name,
      slug: updated.slug,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };

    return NextResponse.json(out, { status: 200 });
  } catch (e) {
    if (e instanceof ZodError) {
      return responseError(e.issues.map((i) => i.message).join(' | '), 400);
    }
    const status =
      e instanceof Error && e.message === 'Unauthorized' ? 401 : 500;
    console.error('PUT category error', e);
    return responseError('Server error', status);
  }
}
