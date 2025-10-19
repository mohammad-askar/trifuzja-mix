// E:/trifuzja-mix/types/admin/adminArticles.ts
/**
 * أنواع خاصة بلوحة الإدارة (Admin) مبنية على الأنواع الأساسية للمقالات.
 */

import type {
  ArticleStatus,
  Locale,
  ArticleDoc,
} from '@/types/core/article';
import type { PageKey } from '@/types/constants/pages';
import type { PaginatedResultBase } from '@/types/core/pagination';

/* ---------- تعريف صف الجدول الإداري ---------- */
export interface AdminArticleRow {
  id: string;
  slug: string;
  title: string;
  pageKey: PageKey;
  locale: Locale;
  status: ArticleStatus;
  createdAt?: string;
  updatedAt?: string;
  revision: number;
  authorName?: string;
  views?: number;
  commentsCount?: number;
  likesCount?: number;
  // حذف viewsCount المكررة لأن لدينا views
  lastEditorId?: string;
}

/* Alias للتمثيل في الجداول */
export type ArticleRowSummary = AdminArticleRow;

/* ---------- محرر الصف ---------- */
export type AdminArticleRowEditable = Omit<
  AdminArticleRow,
  'status' | 'pageKey'
> & {
  status: ArticleStatus | '';
  pageKey: PageKey | '';
};

/* ---------- استعلام + ترقيم ---------- */
export interface AdminArticlesQuery {
  readonly search?: string;
  readonly status?: ArticleStatus;
  readonly pageKey?: PageKey;
  readonly locale?: Locale;
  readonly categoryId?: string;
  readonly tag?: string;
  readonly page?: number;
  readonly limit?: number;
  readonly sort?: string;
}

export interface AdminArticlesPaged
  extends PaginatedResultBase<AdminArticleRow> {
  total: number;
  rows: AdminArticleRow[];
  totalPages: number;
}

/* ---------- تسميات مطابقة للكومبوننت ---------- */
export type ArticleListResult = AdminArticlesPaged;
export type AdminArticlesPage = AdminArticlesPaged;

/* ---------- النتائج المركبة ---------- */
export interface AdminArticlesInitial {
  readonly query: AdminArticlesQuery;
  readonly result: ArticleListResult;
}

export interface AdminBulkActionItemResult {
  slug: string;
  ok: boolean;
  message?: string;
}

export interface AdminBulkActionReport {
  action: string;
  processed: number;
  failed: number;
  items: AdminBulkActionItemResult[];
}

/* ---------- تفاصيل المقال للإدارة ---------- */
export interface AdminArticleDetail extends ArticleDoc {
  commentsCount?: number;
  likesCount?: number;
  viewsCount?: number;
  revisionCount?: number;
}

/* ---------- Utilities ---------- */
export interface AdminArticleDetailPayload {
  article: AdminArticleDetail | null;
  notFound: boolean;
  permissions?: {
    canEdit: boolean;
    canPublish: boolean;
    canDelete: boolean;
  };
}

export interface AdminArticlesDashboardStats {
  total: number;
  drafts: number;
  scheduled: number;
  published: number;
  archived: number;
  viewsSum?: number;
}

export interface AdminArticlesAdvancedFilter {
  statuses?: ArticleStatus[];
  pageKeys?: PageKey[];
  locales?: Locale[];
  minViews?: number;
  maxViews?: number;
  publishedFrom?: string;
  publishedTo?: string;
}

export interface AdminArticlesAdvancedResult {
  filter: AdminArticlesAdvancedFilter;
  page: number;
  limit: number;
  total: number;
  rows: AdminArticleRow[];
}

/* ----------------------------------------------------
 * نهاية الملف
 * -------------------------------------------------- */
