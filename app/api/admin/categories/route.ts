// المسار: /app/api/admin/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/types/auth';
import clientPromise from '@/types/mongodb';
import slugify from 'slugify';
import { z, ZodError } from 'zod';
import { PAGES, PageKey } from '@/types/constants/pages';

/* ► مخطَّط Zod */
const CategoryCreateInput = z.object({
  nameEn: z.string().min(2),
  namePl: z.string().min(2),
  page:   z.enum(PAGES.map(p => p.key) as [PageKey, ...PageKey[]]),
});

/* GET */
export async function GET() {
  try {
    await requireAdmin();
    const db = (await clientPromise).db();
    const cats = await db.collection('categories')
      .find({}, { projection: { name:1, slug:1, page:1, createdAt:1, updatedAt:1 } })
      .sort({ 'name.en': 1 }).toArray();

    return NextResponse.json(cats.map(c => ({ ...c, _id: c._id.toString() })));
  } catch (e) {
    const status = e instanceof Error && e.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error:'Server error' }, { status });
  }
}

/* POST */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const parsed = CategoryCreateInput.parse(await req.json());

    const slug = slugify(parsed.nameEn, { lower:true, strict:true });
    const now  = new Date();

    const db = (await clientPromise).db();
    const dup = await db.collection('categories').findOne({ slug, page:parsed.page });
    if (dup) return NextResponse.json({ error:'Slug exists' }, { status:409 });

    const doc = { slug, page:parsed.page,
                  name:{ en:parsed.nameEn, pl:parsed.namePl },
                  createdAt: now, updatedAt: now };
    const { insertedId } = await db.collection('categories').insertOne(doc);

    return NextResponse.json({ ...doc, _id: insertedId.toString() }, { status:201 });
  } catch (e) {
    if (e instanceof ZodError)
      return NextResponse.json({ error:e.issues.map(i=>i.message).join(' | ') }, { status:400 });
    const status = e instanceof Error && e.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error:'Server error' }, { status });
  }
}
