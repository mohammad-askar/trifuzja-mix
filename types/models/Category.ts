// المسار: /lib/models/Category.ts
import type { ObjectId } from 'mongodb';
import type { PageKey } from '@/types/constants/pages';

/** واجهة TypeScript فقط، بدون Mongoose */
export interface ICategory {
  _id?: ObjectId | string;
  name: { en: string; pl: string };
  page: PageKey;            // 'multi' | 'terra' | 'daily'
}
