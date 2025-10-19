// المسار: /lib/article/normalize.ts
// ملاحظـة: لا نستورد ArticleEditable أو UnknownArticleApi لأنها غير موجودة في ملف الأنواع.
// نعرّف بدلاً منهما أنواعًا محليّة لتجنّب تعديل مجلد types.

import type { Locale } from '@/types/core/article';

/* ---------- أنواع محلية ---------- */

/**
 * شكل الرد الخام غير الموثوق من الـ API (أي شيء).
 * نتركه مفتوحاً لأننا نقوم بالتحقق يدوياً.
 */
export type UnknownArticleApi = Record<string, unknown>;

/**
 * نسخة مخففة قابلة للتحرير (ما يحتاجه المحرّر).
 * لا نستعمل Optional لكل شيء حتى نضمن الحقول الأساسية المتاحة.
 * لا status ولا page هنا.
 */
export interface EditableArticle {
  slug: string;
  /** قد تكون undefined في وضع الفيديو فقط */
  categoryId?: string;
  /** حقول متعددة اللغات بثبات en/pl */
  title: Record<'en' | 'pl', string>;
  excerpt?: Record<'en' | 'pl', string>;
  content?: Record<'en' | 'pl', string>;
  coverUrl?: string;
  videoUrl?: string;
  /** نخزنها كنص (حتى لو وصلتنا كرقم) */
  readingTime?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/* ---------- دوال مساعدة ---------- */

/** تحقق أن القيمة كائن كل قيمه string */
function isRecordOfStrings(v: unknown): v is Record<string, string> {
  if (v === null || typeof v !== 'object') return false;
  return Object.values(v).every((val) => typeof val === 'string');
}

/**
 * يحوّل قيمة (string | record | undefined) إلى سجل ثابت {en, pl}.
 * - إن كانت string نُكرّرها للغتين.
 * - إن كانت record نأخذ en ثم pl مع بدائل معقولة.
 * - إن كانت فارغة نُعيد undefined.
 */
function toLocaleRecordOptional(
  value: unknown,
  localeFallback: Locale,
): Record<'en' | 'pl', string> | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return { en: trimmed, pl: trimmed };
  }

  if (isRecordOfStrings(value)) {
    const obj = value as Record<string, string>;
    const prefer = (k: string) => {
      const v = obj[k];
      return typeof v === 'string' && v.trim() ? v.trim() : undefined;
    };

    const fallbackAny =
      Object.values(obj).find((v) => typeof v === 'string' && v.trim())?.trim() ?? '';

    // en أولاً بالترتيب: en -> localeFallback -> أي قيمة متاحة
    const en =
      prefer('en') ??
      prefer(localeFallback) ??
      fallbackAny;

    // pl أولاً بالترتيب: pl -> localeFallback -> en المختار
    const pl =
      prefer('pl') ??
      prefer(localeFallback) ??
      en;

    if (!en && !pl) return undefined;
    return { en: en || pl, pl: pl || en };
  }

  return undefined;
}

/** قراءة time كرقم أو كنص وإرجاعه كنص ثابت */
function normalizeReadingTime(rt: unknown): string | undefined {
  if (typeof rt === 'number' && Number.isFinite(rt) && rt >= 0) {
    return String(rt);
  }
  if (typeof rt === 'string' && rt.trim()) {
    return rt.trim();
  }
  return undefined;
}

/** تنظيف URL بسيط */
function normalizeUrl(u: unknown): string | undefined {
  if (typeof u !== 'string') return undefined;
  const s = u.trim();
  return s ? s : undefined;
}

/* ---------- المُحوّل الرئيسي ---------- */

/**
 * ✨ يحول الرد الخام (غير الموثوق) من API إلى EditableArticle آمن.
 * يرمي أخطاء واضحة لو الحقول الأساسية مفقودة.
 * - لا يستخدم pageKey ولا status.
 * - slug مطلوب.
 * - title يُولَّد من slug لو لم يتوفر.
 */
export function toEditableArticle(
  apiData: UnknownArticleApi,
  locale: Locale,
): EditableArticle {
  const slug = typeof apiData.slug === 'string' ? apiData.slug.trim() : '';
  if (!slug) throw new Error('Missing slug in article payload');

  const categoryId =
    typeof apiData.categoryId === 'string' && apiData.categoryId.trim()
      ? apiData.categoryId.trim()
      : undefined;

  const title =
    toLocaleRecordOptional(apiData.title, locale) ?? { en: slug, pl: slug };

  const excerpt = toLocaleRecordOptional(apiData.excerpt, locale);
  const content = toLocaleRecordOptional(apiData.content, locale);

  const coverUrl = normalizeUrl(apiData.coverUrl);
  const videoUrl = normalizeUrl(apiData.videoUrl);
  const readingTime = normalizeReadingTime(apiData.readingTime);

  const createdAt =
    apiData.createdAt instanceof Date || typeof apiData.createdAt === 'string'
      ? (apiData.createdAt as Date | string)
      : undefined;

  const updatedAt =
    apiData.updatedAt instanceof Date || typeof apiData.updatedAt === 'string'
      ? (apiData.updatedAt as Date | string)
      : undefined;

  return {
    slug,
    categoryId,
    title,
    excerpt,
    content,
    coverUrl,
    videoUrl,
    readingTime,
    createdAt,
    updatedAt,
  };
}
