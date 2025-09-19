// 📁 app/api/categories/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import clientPromise from '@/types/mongodb';
import type { ObjectId } from 'mongodb';

/* ----------------------------- Types ----------------------------- */
// في قاعدة البيانات قد يكون name سلسلة (بولندية) أو كائن {en,pl} تاريخيًا.
// لذلك نستخدم unknown ونطبّع لاحقًا إلى سلسلة بولندية فقط.
interface CategoryDbDoc {
  _id: ObjectId;
  name: unknown;
  slug?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CategoryApiDoc {
  _id: string;
  name: string; // دائمًا بولندي (أو fallback)
  slug?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/* ---------------------------- Helpers ---------------------------- */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** نستخرج البولندية ثم نFallback للإنجليزية ثم لأول قيمة نصية متاحة */
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

/* ------------------------------ GET ------------------------------ */
export async function GET() {
  try {
    const db = (await clientPromise).db();
    const coll = db.collection<CategoryDbDoc>('categories');

    // نقرأ الحقول اللازمة فقط
    const docs = await coll
      .find({}, { projection: { name: 1, slug: 1, createdAt: 1, updatedAt: 1 } })
      // لا نعتمد على الفرز هنا لأن name قد يكون أنماطًا مختلفة؛ سنفرز بعد التطبيع
      .toArray();

    // تطبيع ثم فرز حسب البولندية
    const normalized = docs
      .map((d) => ({
        _id: d._id.toHexString(),
        name: normalizeNameToPolish(d.name),
        slug: d.slug,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'));

    const res = NextResponse.json<CategoryApiDoc[]>(normalized);
    res.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res;
  } catch (e) {
    console.error('GET /api/categories error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
