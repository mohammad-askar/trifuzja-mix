// 📁 app/api/categories/[id]/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import clientPromise from '@/types/mongodb';
import { ObjectId } from 'mongodb';

type Ctx = { params: Promise<{ id: string }> };

// شكل الوثيقة داخل MongoDB (_id: ObjectId)
interface CategoryDbDoc {
  _id: ObjectId;
  name: string;
  slug?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// شكل الاستجابة للعميل (_id: string)
interface CategoryApiDoc {
  _id: string;
  name: string;
  slug?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const db = (await clientPromise).db();
    const coll = db.collection<CategoryDbDoc>('categories');

    const doc = await coll.findOne(
      { _id: new ObjectId(id) }, // ✅ الآن النوع متوافق مع الفلتر
      { projection: { name: 1, slug: 1, createdAt: 1, updatedAt: 1 } },
    );

    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const out: CategoryApiDoc = {
      _id: doc._id.toHexString(),
      name: doc.name,
      slug: doc.slug,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };

    return NextResponse.json(out);
  } catch (e) {
    console.error('GET /api/categories/[id] error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
