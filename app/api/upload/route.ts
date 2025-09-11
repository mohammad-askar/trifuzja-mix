// المسار: /app/api/upload/route.ts
// ⬆️ لا تضعه داخل [slug]. هذا مسار مستقل لرفع الصور

import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED  = ['image/jpeg','image/png','image/webp','image/gif'];

export async function POST(req: NextRequest) {
  try {
    // 🛡️ حصر الرفع (اختياري) – إن أردت السماح فقط للإداري علّق السطران التاليان
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file sent' }, { status: 400 });

    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported type' }, { status: 415 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 413 });
    }

    // مجلد بتاريخ (سنة/شهر/يوم)
    const now      = new Date();
    const y        = now.getFullYear();
    const m        = String(now.getMonth() + 1).padStart(2,'0');
    const d        = String(now.getDate()).padStart(2,'0');
    const dateDir  = path.join(String(y), m, d);
    const baseDir  = path.join(process.cwd(), 'public', 'uploads', dateDir);
    await mkdir(baseDir, { recursive: true });

    // امتداد آمن من الـ MIME
    const extMap: Record<string,string> = {
      'image/jpeg':'jpg',
      'image/png':'png',
      'image/webp':'webp',
      'image/gif':'gif',
    };
    const ext   = extMap[file.type] || 'bin';
    const name  = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const buf   = Buffer.from(await file.arrayBuffer());

    await writeFile(path.join(baseDir, name), buf);

    const relative = `/uploads/${y}/${m}/${d}/${name}`;

    return NextResponse.json({
      url: relative,
      name,
      type: file.type,
      size: file.size,
    }, { status: 201 });

  } catch (err: unknown) {
    console.error('UPLOAD ERROR', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
