//E:\trifuzja-mix\types\article\normalize.ts

import type { Locale } from '@/types/core/article';

/* ---------- Local types ---------- */

/**
 * Untrusted API payload shape.
 * We keep it open and validate/normalize manually.
 */
export type UnknownArticleApi = Record<string, unknown>;

/**
 * Minimal editable shape for the editor.
 * No status/page here.
 */
export interface EditableArticle {
  slug: string;
  categoryId?: string;
  title: Record<'en' | 'pl', string>;
  excerpt?: Record<'en' | 'pl', string>;
  content?: Record<'en' | 'pl', string>;
  coverUrl?: string;
  readingTime?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/* ---------- Helpers ---------- */

function isRecordOfStrings(v: unknown): v is Record<string, string> {
  if (v === null || typeof v !== 'object') return false;
  return Object.values(v).every((val) => typeof val === 'string');
}

/**
 * Convert (string | record | undefined) into a stable {en, pl} record.
 * - If string: duplicate into both languages.
 * - If record: prefer explicit keys, fallback to any existing value.
 * - If empty: return undefined.
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
    const obj = value;

    const pick = (k: string): string | undefined => {
      const v = obj[k];
      return v && v.trim() ? v.trim() : undefined;
    };

    const anyFallback =
      Object.values(obj).find((v) => v.trim())?.trim() ?? '';

    const en = pick('en') ?? pick(localeFallback) ?? anyFallback;
    const pl = pick('pl') ?? pick(localeFallback) ?? en;

    if (!en && !pl) return undefined;
    return { en: en || pl, pl: pl || en };
  }

  return undefined;
}

/** Normalize readingTime to a string (number -> string). */
function normalizeReadingTime(rt: unknown): string | undefined {
  if (typeof rt === 'number' && Number.isFinite(rt) && rt >= 0) return String(rt);
  if (typeof rt === 'string' && rt.trim()) return rt.trim();
  return undefined;
}

/** Simple string cleanup for URLs/paths. */
function normalizeUrl(u: unknown): string | undefined {
  if (typeof u !== 'string') return undefined;
  const s = u.trim();
  return s ? s : undefined;
}

/* ---------- Main normalizer ---------- */

/**
 * Convert untrusted API payload to a safe EditableArticle.
 * Throws clear errors if required fields are missing.
 * - No pageKey/status fields.
 * - slug is required.
 * - title falls back to slug if missing.
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

  const title = toLocaleRecordOptional(apiData.title, locale) ?? { en: slug, pl: slug };
  const excerpt = toLocaleRecordOptional(apiData.excerpt, locale);
  const content = toLocaleRecordOptional(apiData.content, locale);

  const coverUrl = normalizeUrl(apiData.coverUrl);
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
    readingTime,
    createdAt,
    updatedAt,
  };
}
