// 📁 app/api/admin/categories/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/types/auth';
import clientPromise from '@/types/mongodb';
import slugify from 'slugify';
import { z, ZodError } from 'zod';

/* --------------------------- Zod Schemas --------------------------- */
// ✅ أحادي اللغة: اسم واحد فقط
const CategoryCreateInput = z.object({
  name: z.string().trim().min(2, 'name must be at least 2 characters'),
});

/* -------------------------------- GET ------------------------------ */
/** يرجع كل التصنيفات (name: string, slug: string) مع فرز أبجدي بالاسم. */
export async function GET() {
  try {
    await requireAdmin();

    const db = (await clientPromise).db();
    const cats = await db
      .collection('categories')
      .find(
        {},
        {
          projection: { name: 1, slug: 1, createdAt: 1, updatedAt: 1 },
        },
      )
      .sort({ name: 1 }) // ← فرز بالاسم الأحادي
      .toArray();

    return NextResponse.json(
      cats.map((c) => ({ ...c, _id: c._id.toString() })),
      { status: 200 },
    );
  } catch (e) {
    const status =
      e instanceof Error && e.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: 'Server error' }, { status });
  }
}

/* -------------------------------- POST ----------------------------- */
/** إنشاء تصنيف جديد أحادي اللغة، مع فحص تكرار الـ slug على مستوى المجموعة. */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const parsed = CategoryCreateInput.parse(await req.json());

    const name = parsed.name.trim();
    const slug = slugify(name, { lower: true, strict: true });
    const now = new Date();

    const db = (await clientPromise).db();

    // فحص تكرار slug عالميًا
    const dup = await db.collection('categories').findOne({ slug });
    if (dup) {
      return NextResponse.json({ error: 'Slug exists' }, { status: 409 });
    }

    const doc: {
      name: string;
      slug: string;
      createdAt: Date;
      updatedAt: Date;
    } = {
      name,
      slug,
      createdAt: now,
      updatedAt: now,
    };

    const { insertedId } = await db.collection('categories').insertOne(doc);

    return NextResponse.json(
      { ...doc, _id: insertedId.toString() },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        { error: e.issues.map((i) => i.message).join(' | ') },
        { status: 400 },
      );
    }
    const status =
      e instanceof Error && e.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: 'Server error' }, { status });
  }
}
