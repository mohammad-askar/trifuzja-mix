//E:\trifuzja-mix\app\api\categories\[id]\route.ts
import { NextResponse } from 'next/server';
import clientPromise from '@/types/mongodb';

/* ---------- GET: قائمة الفئات للجميع ---------- */
export async function GET() {
  try {
    const db = (await clientPromise).db();          // ← يتصل بقاعدة trifuzia حسب MONGODB_URI
    const cats = await db
      .collection('categories')
      .find(
        {},
        { projection: { name: 1 } },               // لا حاجة لبقية الحقول هنا
      )
      .sort({ 'name.en': 1 })
      .toArray();

    /* تأكد من تحويل _id إلى string لإرسال JSON نظيف */
    const list = cats.map(({ _id, name }) => ({
      _id: _id.toString(),
      name,
    }));

    return NextResponse.json(list);
  } catch (e) {
    console.error('GET /api/categories', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
