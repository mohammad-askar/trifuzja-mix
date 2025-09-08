//E:\trifuzja-mix\app\api\admin\categories\[id]\route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/types/mongodb';
import { requireAdmin } from '@/types/auth';
import slugify from 'slugify';
export async function DELETE(req: NextRequest) {
  await requireAdmin();

  const id = req.nextUrl.pathname.split('/').pop()!;
  if (!/^[0-9a-fA-F]{24}$/.test(id))
    return NextResponse.json({ error: 'Invalid id format' }, { status: 400 });

  try {
    const db  = (await clientPromise).db();
    const res = await db.collection('categories').deleteOne({ _id: new ObjectId(id) });

    if (res.deletedCount === 0)
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    console.info('Category deleted', id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error('DELETE category error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
export async function PUT(req: NextRequest) {
  await requireAdmin();

  const id = req.nextUrl.pathname.split('/').pop()!;
  if (!/^[0-9a-fA-F]{24}$/.test(id))
    return NextResponse.json({ error: 'Invalid id format' }, { status: 400 });

  try {
    const body = await req.json();
    const { nameEn, namePl, page } = body;

    if (typeof nameEn !== 'string' || typeof namePl !== 'string' || typeof page !== 'string') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const slug = slugify(nameEn, { lower: true, strict: true });
    const now = new Date();

    const db = (await clientPromise).db();

    // Check duplicate slug with different id
    const dup = await db.collection('categories').findOne({ slug, page, _id: { $ne: new ObjectId(id) } });
    if (dup) return NextResponse.json({ error: 'Slug exists' }, { status: 409 });

    const updateResult = await db.collection('categories').findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          slug,
          page,
          name: { en: nameEn, pl: namePl },
          updatedAt: now,
        },
      },
      { returnDocument: 'after' }
    );

    if (!updateResult.value) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const updatedCat = updateResult.value;

    // أنشئ نسخة جديدة مع تحويل _id إلى نص
    const responseCat = {
      ...updatedCat,
      _id: updatedCat._id.toString(),
    };

    return NextResponse.json(responseCat);
  } catch (e) {
    console.error('PUT category error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}