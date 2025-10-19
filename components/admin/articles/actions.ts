// components/admin/articles/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/types/mongodb';

export type DeleteResult = { ok: true } | { error: string };

/** أعِد توليد صفحة قائمة المقالات للغتين */
function revalidateAdminArticlesList() {
  revalidatePath('/en/admin/articles', 'page');
  revalidatePath('/pl/admin/articles', 'page');
}

/** حذف مقال (بالـ slug) */
export async function deleteArticle(slug: string): Promise<DeleteResult> {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    const db = (await clientPromise).db();
    const res = await db.collection('articles').deleteOne({ slug: decodeURIComponent(slug) });
    if (res.deletedCount === 0) return { error: 'Not found' };

    revalidateAdminArticlesList();
    return { ok: true };
  } catch (e) {
    console.error('deleteArticle action error:', e);
    return { error: 'Server error' };
  }
}
