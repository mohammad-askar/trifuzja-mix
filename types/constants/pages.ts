// 📁 E:\trifuzja-mix\lib\constants\pages.ts
export interface PageDef {
  key: PageKey;
  labelEn: string;
  labelPl: string;
}
export type PageKey = 'multi' | 'terra' | 'daily';

export const PAGES: PageDef[] = [
  { key: 'multi', labelEn: 'Multi', labelPl: 'Multi' },
  { key: 'terra', labelEn: 'Terra', labelPl: 'Terra' },
  { key: 'daily', labelEn: 'Daily', labelPl: 'Daily' },
];
