// المسار: /lib/article/normalize.ts
// ملاحظـة: لا نستورد ArticleEditable أو UnknownArticleApi لأنها غير موجودة في ملف الأنواع.
// نعرّف بدلاً منهما أنواعًا محليّة لتجنّب تعديل مجلد types.

// يمكنك استيراد الأنواع الموجودة فعلاً (Locale, PageKey) إن كانت متوفرة
import type { Locale, PageKey } from '@/types/core/article'; // غيّر المسار لو ملفك في مكان آخر

/* ---------- أنواع محلية ---------- */

/**
 * شكل الرد الخام غير الموثوق من الـ API (أي شيء).
 * نتركه مفتوحاً لأننا نقوم بالتحقق يدوياً.
 */
export type UnknownArticleApi = Record<string, unknown>;

/**
 * نسخة مخففة قابلة للتحرير (ما يحتاجه المحرّر).
 * لا نستعمل Optional لكل شيء حتى نضمن الحقول الأساسية.
 */
export interface EditableArticle {
  slug: string;
  page: PageKey;
  status: 'draft' | 'published';
  categoryId: string;
  title: Record<string, string>;
  excerpt?: Record<string, string>;
  content?: Record<string, string>;
  coverUrl?: string;
  videoUrl?: string;
  readingTime?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/* ---------- دوال مساعدة ---------- */

/* تحقق أن القيمة كائن كل قيمه string */
function isRecordOfStrings(v: unknown): v is Record<string, string> {
  if (v === null || typeof v !== 'object') return false;
  return Object.values(v).every(val => typeof val === 'string');
}

/* يحوّل قيمة (string | object | undefined) إلى Record<string,string> */
export function normalizeRecord(
  value: unknown,
  localeFallback: Locale,
): Record<string, string> | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return { [localeFallback]: trimmed };
  }
  if (isRecordOfStrings(value)) return value;
  return undefined;
}

/**
 * ✨ يحول الرد الخام (غير الموثوق) من API إلى EditableArticle آمن.
 * يرمي أخطاء واضحة لو الحقول الأساسية مفقودة.
 */
export function toEditableArticle(
  apiData: UnknownArticleApi,
  locale: Locale,
): EditableArticle {
  const slug = typeof apiData.slug === 'string' ? apiData.slug.trim() : '';
  if (!slug) throw new Error('Missing slug in article payload');

  const page = (typeof apiData.page === 'string'
    ? apiData.page
    : 'multi') as PageKey;

  const status: 'draft' | 'published' =
    apiData.status === 'published' ? 'published' : 'draft';

  const categoryId =
    typeof apiData.categoryId === 'string'
      ? apiData.categoryId
      : '';
  if (!categoryId) throw new Error('Missing categoryId in article payload');

  const title =
    normalizeRecord(apiData.title, locale) ?? { [locale]: slug };
  const excerpt = normalizeRecord(apiData.excerpt, locale);
  const content = normalizeRecord(apiData.content, locale);

  const coverUrl =
    typeof apiData.coverUrl === 'string' && apiData.coverUrl.trim()
      ? apiData.coverUrl
      : undefined;

  const videoUrl =
    typeof apiData.videoUrl === 'string' && apiData.videoUrl.trim()
      ? apiData.videoUrl
      : undefined;

  const readingTime =
    typeof apiData.readingTime === 'string' && apiData.readingTime.trim()
      ? apiData.readingTime
      : undefined;

  return {
    slug,
    page,
    status,
    categoryId,
    title,
    excerpt,
    content,
    coverUrl,
    videoUrl,
    readingTime,
    createdAt: apiData.createdAt as Date | string | undefined,
    updatedAt: apiData.updatedAt as Date | string | undefined,
  };
}
