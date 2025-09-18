// 📁 app/api/categories/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import clientPromise from '@/types/mongodb';
import type { ObjectId } from 'mongodb';

interface CategoryDbDoc {
  _id: ObjectId;
  name: string;          // اسم واحد (بولندي)
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

export async function GET() {
  try {
    const db = (await clientPromise).db();
    const coll = db.collection<CategoryDbDoc>('categories');

    const docs = await coll
      .find({}, { projection: { name: 1, slug: 1, createdAt: 1, updatedAt: 1 } })
      .sort({ name: 1 })
      .toArray();

    const out: CategoryApiDoc[] = docs.map((d) => ({
      _id: d._id.toHexString(),
      name: d.name,
      slug: d.slug,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));

    const res = NextResponse.json(out);
    res.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res;
  } catch (e) {
    console.error('GET /api/categories error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
