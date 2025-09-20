// أنواع مشتركة
export type Locale = 'en' | 'pl';
export type CoverPosition = { x: number; y: number };

export type CategoryFromApi =
  | { _id: string; name: string; slug?: string }
  | { _id: string; name: Partial<Record<Locale, string>>; slug?: string };

export interface CategoryUI {
  _id: string;
  name: string;
}
