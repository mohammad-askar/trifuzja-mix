// المسار: /app/api/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/types/mongodb';
import type { PageKey } from '@/types/constants/pages';

export async function GET(req: NextRequest) {
  const url  = req.nextUrl;
  const page = url.searchParams.get('page') as PageKey | null; // ?page=multi

  const db   = (await clientPromise).db();
  const cats = await db
    .collection('categories')
    .find(page ? { page } : {})
    .sort({ 'name.en': 1 })
    .toArray();

  return NextResponse.json(cats);
}
