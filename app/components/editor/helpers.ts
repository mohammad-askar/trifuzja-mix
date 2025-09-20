import slugify from 'slugify';
import type { Locale, CategoryFromApi } from './article.types';

export const makeSlug = (s: string) => slugify(s, { lower: true, strict: true });

export const readingTimeFromHtml = (html: string, unit: string) => {
  const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} ${unit}`;
};

export const lenGT3 = (s: string) => s.trim().length > 3;

export const fromAny = (
  val: string | Record<Locale, string> | undefined,
  preferred: Locale,
): string => {
  if (typeof val === 'string') return val;
  return val?.[preferred] ?? val?.pl ?? val?.en ?? '';
};

export function toPolishName(name: CategoryFromApi['name']): string {
  if (typeof name === 'string') return name.trim();
  const pl = typeof name.pl === 'string' ? name.pl.trim() : '';
  if (pl) return pl;
  const en = typeof name.en === 'string' ? name.en.trim() : '';
  if (en) return en;
  const first = Object.values(name).find(
    (v): v is string => typeof v === 'string' && v.trim().length > 0,
  );
  return (first ?? '').trim();
}
