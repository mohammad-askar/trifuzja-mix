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
export type ArticleStatus =
  | 'draft'
  | 'review'
  | 'scheduled'
  | 'published'
  | 'archived';

export type Locale = 'en'  | 'pl';

export type PageKey = 'multi' | 'terra' | 'daily';

/* ----------------------------------------------------
 * 3) Core Document Types
 * -------------------------------------------------- */
export interface ArticleDoc {
  _id: string;
  slug: string;
  title: string;
  coverUrl?: string;
  videoUrl?: string;
  description?: string;
  contentHtml: string;
  contentRaw?: unknown;
  locale: Locale;
  pageKey: PageKey;
  status: ArticleStatus;
  authorId: string;
  authorName?: string;
  categories?: CategoryRef[];
  tags?: string[];
  heroImageUrl?: string;
  thumbnailUrl?: string;
  publishedAt?: string;
  scheduledFor?: string;
  createdAt: string;
  updatedAt: string;
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
  contentRaw: unknown;
  locale: Locale;
  pageKey: PageKey;
  status?: ArticleStatus;
  categories?: string[];
  tags?: string[];
  heroImageUrl?: string;
  thumbnailUrl?: string;
  scheduledFor?: string;
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
  pageKey?: PageKey;
  status?: ArticleStatus;
  categories?: string[];
  tags?: string[];
  heroImageUrl?: string;
  thumbnailUrl?: string;
  scheduledFor?: string | null;
  meta?: {
    title?: string | null;
    description?: string | null;
    ogImage?: string | null;
    [key: string]: unknown;
  };
}

export interface ArticleQueryParams {
  search?: string;
  status?: ArticleStatus;
  pageKey?: PageKey;
  locale?: Locale;
  categoryId?: string;
  tag?: string;
  page?: number;
  limit?: number;
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
  pageKey: PageKey;
  status: ArticleStatus;
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
  pageKey: PageKey;
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
  pageKey: PageKey;
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
  action: 'publish' | 'unpublish' | 'archive' | 'delete' | string;
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
meta?: Record<string, unknown>;
  scheduledFor?: string;
  thumbnailUrl?: string;
  title: Record<Locale, string>;
  description?: string;
  contentHtml: string;
  contentRaw?: Record<Locale, string>;
  locale: Locale;
  pageKey: PageKey;
  status: ArticleStatus;
  categories?: string[];
  heroImageUrl?: string;
  tags?: string[];    
  // بقية الحقول...
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
export function isArticlePublished(
  a: { status: ArticleStatus; publishedAt?: string },
): a is { status: 'published'; publishedAt: string } {
  return a.status === 'published' && !!a.publishedAt;
}

export function isArticleScheduled(a: {
  status: ArticleStatus;
  scheduledFor?: string;
}): boolean {
  return a.status === 'scheduled' && !!a.scheduledFor;
}
/* هل القيمة تنتمي لأحد حالة ArticleStatus؟ */
export function isArticleStatus(value: unknown): value is ArticleStatus {
  return (
    typeof value === 'string' &&
    ['draft', 'review', 'scheduled', 'published', 'archived'].includes(value)
  );
}
export function buildArticleSeoPayload(
  article: Pick<
    ArticlePublic,
    'title' | 'description' | 'meta' | 'locale' | 'slug' | 'pageKey' | 'tags'
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
export interface ArticleFromApi {
  _id?: string;
  slug?: string;
  title?: string | Record<string, string>;
  excerpt?: string | Record<string, string>;
  content?: string | Record<string, string>;
  contentHtml?: string;
  page?: string;
  pageKey?: PageKey;
  status?: ArticleStatus;
  categoryId?: string;
  categoryIds?: string[];
  coverUrl?: string;
  heroImageUrl?: string;
  videoUrl?: string;
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
