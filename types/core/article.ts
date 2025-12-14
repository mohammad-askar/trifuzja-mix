// E:\trifuzja-mix\types\core\article.ts
/**
 * مصدر الحقيقة لأنواع المقال (Article Domain Types)
 * أي نوع يبدأ بـ Article يُعرَّف هنا.
 *
 * الأقسام:
 *  1) Imports
 *  2) Constants & Unions
 *  3) Core Document Types
 *  4) Input (Create / Update) Types
 *  5) View / Presentation Types
 *  6) Composite / Result Types
 *  7) Derived Utility Types
 *  8) Type Guards / Helpers
 *  9) Legacy / API Compatibility
 */

/* ----------------------------------------------------
 * 1) Imports
 * -------------------------------------------------- */
import type { PaginatedResultBase } from './pagination';

/**
 * مرجع فئة مبسط (يمكن دمجه مع نموذج Category لاحقاً)
 */
export interface CategoryRef {
  id: string;
  slug: string;
  name: string;
}

/* ----------------------------------------------------
 * 2) Constants & Unions
 * -------------------------------------------------- */

/** لم يعد لدينا إلا حالة نشر واحدة */
export type ArticleStatus = 'published';

export type Locale = 'en' | 'pl';

/* ----------------------------------------------------
 * 3) Core Document Types
 * -------------------------------------------------- */
export interface ArticleDoc {
  _id: string;
  slug: string;
  title: string;
  coverUrl?: string;
  description?: string;
  /** HTML النهائي للعرض */
  contentHtml: string;
  /** محتوى خام متعدد اللغات (اختياري للتوافق/التحرير) */
  contentRaw?: unknown;
  locale: Locale;

  /** ثابت الآن: كل المقالات منشورة */
  status: 'published';

  authorId: string;
  authorName?: string;
  categories?: CategoryRef[];
  tags?: string[];
  heroImageUrl?: string;
  thumbnailUrl?: string;

  /** تاريخ النشر (ISO string) */
  publishedAt?: string;

  /** إنشاء/تعديل */
  createdAt: string;
  updatedAt: string;

  /** رقم المراجعة (إن استُخدم) */
  revision: number;

  meta?: {
    title?: string;
    description?: string;
    ogImage?: string;
    [key: string]: unknown;
  };

  metrics?: {
    views?: number;
    likes?: number;
    comments?: number;
    [key: string]: number | undefined;
  };
}

/* ----------------------------------------------------
 * 4) Input (Create / Update) Types
 * -------------------------------------------------- */
export interface ArticleCreateInput {
  slug: string;
  title: string;
  description?: string;
  /** الخام القادم من المحرر (غالباً {en,pl}) */
  contentRaw: unknown;
  locale: Locale;
  categories?: string[];
  tags?: string[];
  heroImageUrl?: string;
  thumbnailUrl?: string;
  /** يمكن أن تُملأ عند الإنشاء لإظهار تاريخ النشر */
  publishedAt?: string;
  meta?: {
    title?: string;
    description?: string;
    ogImage?: string;
    [key: string]: unknown;
  };
}

export interface ArticleUpdateInput {
  slug: string;
  title?: string;
  description?: string;
  contentRaw?: unknown;
  locale?: Locale;
  categories?: string[];
  tags?: string[];
  heroImageUrl?: string;
  thumbnailUrl?: string;
  /** تعيين/تحديث تاريخ النشر عند الحاجة */
  publishedAt?: string | null;
  meta?: {
    title?: string | null;
    description?: string | null;
    ogImage?: string | null;
    [key: string]: unknown;
  };
}

/** استعلامات لوحة الإدارة/القائمة */
export interface ArticleQueryParams {
  search?: string;
  locale?: Locale;
  categoryId?: string;
  tag?: string;
  page?: number;
  limit?: number;
  /** مثال: "-createdAt", "title" … */
  sort?: string;
}

/* ----------------------------------------------------
 * 5) View / Presentation Types
 * -------------------------------------------------- */
export interface ArticleSummary {
  slug: string;
  title: string;
  description?: string;
  locale: Locale;
  status: 'published';
  publishedAt?: string;
  heroImageUrl?: string;
  tags?: string[];
}

export interface ArticleRowSummary extends ArticleSummary {
  updatedAt: string;
  createdAt: string;
  revision: number;
  authorName?: string;
  views?: number;
}

export interface ArticlePublic {
  slug: string;
  title: string;
  description?: string;
  contentHtml: string;
  locale: Locale;
  publishedAt?: string;
  heroImageUrl?: string;
  thumbnailUrl?: string;
  tags?: string[];
  categories?: CategoryRef[];
  meta?: {
    title?: string;
    description?: string;
    ogImage?: string;
    [key: string]: unknown;
  };
}

export type PaginatedArticles = PaginatedResultBase<ArticleRowSummary>;

/* ----------------------------------------------------
 * 6) Composite / Result Types
 * -------------------------------------------------- */
export interface ArticleSearchResult {
  slug: string;
  title: string;
  excerpt?: string;
  score?: number;
  locale: Locale;
  publishedAt?: string;
}

export interface ArticleSearchResponse {
  query: string;
  page: number;
  limit: number;
  total: number;
  results: ArticleSearchResult[];
}

export interface ArticleBulkActionItem {
  slug: string;
  ok: boolean;
  message?: string;
}

export interface ArticleBulkActionReport {
  /** تُركت عامة للتوافق (مثلاً delete) */
  action: 'delete' | string;
  processed: number;
  failed: number;
  items: ArticleBulkActionItem[];
}

export interface ArticleSeoPayload {
  title: string;
  description?: string;
  ogImage?: string;
  locale: Locale;
  canonicalUrl?: string;
  tags?: string[];
}

/* ----------------------------------------------------
 * 7) Derived Utility Types
 * -------------------------------------------------- */
export interface ArticleEditable {
  slug: string;
  title: Record<'en' | 'pl', string>;
  description?: string;
  contentHtml: string;
  contentRaw: Record<'en' | 'pl', string>;
  locale: Locale;
  /** لم نعد نستخدم الحالات؛ الكل منشور */
  heroImageUrl?: string;
  thumbnailUrl?: string;
  /** ISO string if present */
  scheduledFor?: string;
  meta?: Record<string, unknown>;
}

export type ArticlePublished = ArticleDoc & {
  status: 'published';
  publishedAt: string;
};

export type ArticleClientView = ArticlePublic & {
  views?: number;
  likes?: number;
  comments?: number;
};

export type ArticleCategoryIds = string[];

export type ArticleNormalizedCreate = Omit<
  ArticleDoc,
  '_id' | 'revision' | 'metrics' | 'createdAt' | 'updatedAt'
>;

export type ArticlesPage = PaginatedArticles;

/* ----------------------------------------------------
 * 8) Type Guards / Helpers
 * -------------------------------------------------- */

/** بما أن الحالة الوحيدة هي 'published' */
export function isArticleStatus(value: unknown): value is ArticleStatus {
  return value === 'published';
}

export function buildArticleSeoPayload(
  article: Pick<
    ArticlePublic,
    'title' | 'description' | 'meta' | 'locale' | 'slug' | 'tags'
  > & { heroImageUrl?: string },
): ArticleSeoPayload {
  return {
    title: article.meta?.title || article.title,
    description: article.meta?.description || article.description,
    ogImage: article.meta?.ogImage || article.heroImageUrl,
    locale: article.locale,
    tags: article.tags,
  };
}

/* ----------------------------------------------------
 * 9) Legacy / API Compatibility
 * -------------------------------------------------- */
/**
 * واجهة مرنة للتعامل مع ردود API القديمة/المختلطة.
 * أبقينا بعض الحقول اختيارية للتوافق (status/pageKey)، لكن
 * المنظومة الحديثة تتجاهلهما.
 */
export interface ArticleFromApi {
  _id?: string;
  slug?: string;
  title?: string | Record<string, string>;
  excerpt?: string | Record<string, string>;
  content?: string | Record<string, string>;
  contentHtml?: string;

  /** لم يعد مستخدمًا في النطاق الحديث */
  pageKey?: string;

  /** للتوافق فقط: إن وُجد فسيكون 'published' */
  status?: 'published';

  categoryId?: string;
  categoryIds?: string[];
  coverUrl?: string;
  heroImageUrl?: string;
  thumbnailUrl?: string;
  readingTime?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  scheduledFor?: string;
  tags?: string[];
  meta?: {
    title?: string;
    description?: string;
    ogImage?: string;
    [k: string]: unknown;
  };
}

/* ----------------------------------------------------
 * نهاية الملف
 * -------------------------------------------------- */
