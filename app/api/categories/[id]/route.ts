// 📁 app/api/categories/[id]/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import clientPromise from '@/types/mongodb';
import { ObjectId } from 'mongodb';

type Ctx = { params: Promise<{ id: string }> };

// وثيقة قاعدة البيانات (_id: ObjectId)
// قد تكون name سلسلة أو كائن {en,pl} تاريخيًا، لذا نستعمل unknown ونطبّع.
interface CategoryDbDoc {
  _id: ObjectId;
  name: unknown;
  slug?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// استجابة الـ API (_id: string) — دائمًا اسم واحد (بولندي)
interface CategoryApiDoc {
  _id: string;
  name: string;
  slug?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/* ----------------------------- Helpers ----------------------------- */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** نحاول استخراج البولندية ثم نرجع للإنجليزية ثم لأول قيمة نصية */
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

/* ------------------------------ GET -------------------------------- */
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const db = (await clientPromise).db();
    const coll = db.collection<CategoryDbDoc>('categories');

    const doc = await coll.findOne(
      { _id: new ObjectId(id) },
      { projection: { name: 1, slug: 1, createdAt: 1, updatedAt: 1 } },
    );

    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const out: CategoryApiDoc = {
      _id: doc._id.toHexString(),
      name: normalizeNameToPolish(doc.name), // ✅ نعيد دائمًا اسمًا بولنديًا كسلسلة
      slug: doc.slug,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };

    const res = NextResponse.json(out);
    res.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res;
  } catch (e) {
    console.error('GET /api/categories/[id] error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
