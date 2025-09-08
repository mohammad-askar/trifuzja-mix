// E:\trifuzja-mix\types\core\pagination.ts
/**
 * نوع عام لنتائج الترقيم.
 */
export interface PaginatedResultBase<T> {
  page: number;
  limit: number;
  total: number;
  items: T[];
  hasNext: boolean;
  hasPrev: boolean;
}
