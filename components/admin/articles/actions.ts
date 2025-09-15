// components/admin/articles/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

import clientPromise from '@/types/mongodb';
import { ObjectId } from 'mongodb';
import { ArticleStatus } from '@/types/core/article';

export type DeleteResult = { ok: true } | { error: string };

/* ✅ تبديل الحالة Published ↔ Draft (بالـ _id) */
export async function toggleStatus(articleId: string): Promise<{ ok: true } | { error: string }> {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    const db = (await clientPromise).db();

    const _id = new ObjectId(articleId);
    const art = await db
      .collection('articles')
      .findOne<{ _id: ObjectId; status: ArticleStatus }>({ _id }, { projection: { status: 1 } });

    if (!art) return { error: 'Article not found' };

    const newStatus: ArticleStatus = art.status === 'published' ? 'draft' : 'published';

    await db.collection('articles').updateOne(
      { _id },
      { $set: { status: newStatus, updatedAt: new Date() } },
    );

    // تحديث قائمة المقالات في لوحة الإدارة
    revalidatePath('/[locale]/admin/articles');
    return { ok: true };
  } catch (e) {
    console.error('toggleStatus action error:', e);
    return { error: 'Server error' };
  }
}

/* ✅ حذف مقال (بالـ slug) — مُtyped وبتحقق من صلاحيات الأدمن */
export async function deleteArticle(slug: string): Promise<DeleteResult> {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    const db = (await clientPromise).db();
    const res = await db.collection('articles').deleteOne({ slug: decodeURIComponent(slug) });

    if (res.deletedCount === 0) return { error: 'Not found' };

    // إعادة توليد جدول الإدارة (وكذلك أي قوائم تعتمد على نفس البيانات إن كنت تضيف revalidatePath أخرى)
    revalidatePath('/[locale]/admin/articles');
    return { ok: true };
  } catch (e) {
    console.error('deleteArticle action error:', e);
    return { error: 'Server error' };
  }
}
