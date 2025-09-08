// components/admin/articles/actions.ts
'use server';

import { revalidatePath } from 'next/cache';

import clientPromise                     from '@/types/mongodb';
import { ObjectId }                      from 'mongodb';
import { ArticleStatus }                 from '@/types/core/article';

/* ✅ تبديل الحالة Published ↔ Draft
   -------------------------------------------------------------- */
export async function toggleStatus(articleId: string) {
  const db  = (await clientPromise).db();
  const art = await db.collection('articles').findOne(
    { _id: new ObjectId(articleId) },
    { projection: { status: 1, slug: 1, page: 1 } },
  );

  if (!art) throw new Error('Article not found');

  const newStatus: ArticleStatus =
    art.status === 'published' ? 'draft' : 'published';

  await db.collection('articles').updateOne(
    { _id: art._id },
    { $set: { status: newStatus, updatedAt: new Date() } },
  );

  revalidatePath('/[locale]/admin/articles');   // ✅ تحديث الجدول
}

/* ✅ حذف مقال
   -------------------------------------------------------------- */
export async function deleteArticle(articleId: string) {
  const db = (await clientPromise).db();
  await db.collection('articles').deleteOne({ _id: new ObjectId(articleId) });

  revalidatePath('/[locale]/admin/articles');
}
