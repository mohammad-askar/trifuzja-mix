// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// إعداد Cloudinary من env (خلي القيم في .env.local + Vercel env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(req: NextRequest) {
  try {
    // 🛡️ السماح بس للإداريين
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file sent' }, { status: 400 });
    }

    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported type' }, { status: 415 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 413 });
    }

    // 🌀 قراءة الباينري وتحويله Base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    // رفع إلى Cloudinary
    const uploadRes = await cloudinary.uploader.upload(dataUri, {
      folder: 'articles', // مجلد في Cloudinary (ممكن تغيره)
      resource_type: 'image',
    });

    return NextResponse.json(
      {
        url: uploadRes.secure_url,
        public_id: uploadRes.public_id,
        width: uploadRes.width,
        height: uploadRes.height,
        format: uploadRes.format,
      },
      { status: 201 },
    );
  } catch (err: unknown) {
  console.error('UPLOAD ERROR', err);
  return NextResponse.json(
    { error: 'Upload failed', details: (err as Error).message },
    { status: 500 }
  );
}
}
