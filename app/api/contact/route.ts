// app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import clientPromise from '@/types/mongodb';

const BodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().email().max(320),
  message: z.string().trim().min(1).max(5000),
  locale: z.enum(['en', 'pl']).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = BodySchema.parse(await req.json());
    const db = (await clientPromise).db();
    await db.collection('messages').insertOne({
      ...body,
      createdAt: new Date(),
      ip: req.headers.get('x-forwarded-for') ?? null,
      ua: req.headers.get('user-agent') ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues.map(i => i.message).join(' | ') }, { status: 400 });
    }
    console.error('POST /api/contact error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
