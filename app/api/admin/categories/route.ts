// 📁 app/api/admin/categories/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/types/auth';
import clientPromise from '@/types/mongodb';
import slugify from 'slugify';
import { z, ZodError } from 'zod';

/* --------------------------- Types --------------------------- */
import type { ObjectId } from 'mongodb';

interface CategoryDbDoc {
  _id: ObjectId;
  // قد تكون string (جديدة) أو {en,pl} (قديمة) — نطبّع عند القراءة
  name: unknown;
  slug?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CategoryAdminApiDoc {
  _id: string;
  name: string; // دائمًا بولندي (أو fallback)
  slug?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/* -------------------------- Helpers -------------------------- */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** استخراج البولندية ثم الإنجليزية ثم أول قيمة نصية متاحة */
function normalizeNameToPolish(input: unknown): string {
  if (typeof input === 'string') return input.trim();
  if (isRecord(input)) {
    const pl = typeof input.pl === 'string' ? input.pl.trim() : '';
    if (pl) return pl;
    const en = typeof input.en === 'string' ? input.en.trim() : '';
    if (en) return en;
    const first = Object.values(input).find(
      (v): v is string => typeof v === 'string' && v.trim().length > 0,
    );
    return (first ?? '').trim();
  }
  return '';
}

/* --------------------------- Zod Schemas --------------------------- */
// ✅ أحادي اللغة: اسم واحد فقط (بولندي)
const CategoryCreateInput = z.object({
  name: z.string().trim().min(2, 'name must be at least 2 characters'),
});

/* -------------------------------- GET ------------------------------ */
/** يرجع كل التصنيفات (name: string, slug: string) مرتبة حسب البولندية فقط. */
export async function GET() {
  try {
    await requireAdmin();

    const db = (await clientPromise).db();
    const docs = await db
      .collection<CategoryDbDoc>('categories')
      .find(
        {},
        {
          projection: { name: 1, slug: 1, createdAt: 1, updatedAt: 1 },
        },
      )
      // لا نفرز هنا لأن name قد يكون بصيغ مختلفة
      .toArray();

    const cats: CategoryAdminApiDoc[] = docs
      .map((c) => ({
        _id: c._id.toString(),
        name: normalizeNameToPolish(c.name),
        slug: c.slug,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'));

    return NextResponse.json(cats, { status: 200 });
  } catch (e) {
    const status =
      e instanceof Error && e.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: 'Server error' }, { status });
  }
}

/* -------------------------------- POST ----------------------------- */
/** إنشاء تصنيف جديد أحادي اللغة (بولندي)، مع فحص تكرار الـ slug على مستوى المجموعة. */
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
      name, // ← بولندي فقط
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
