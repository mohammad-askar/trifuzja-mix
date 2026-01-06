// 📁 app/api/upload/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { auth } from "@/auth";
import { z, ZodError } from "zod";

/* ---------------------- Zod للتحقق من البيئة ---------------------- */
const EnvSchema = z.object({
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME missing"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY missing"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET missing"),
});

const env = EnvSchema.parse({
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
});

/* ---------------------- إعداد Cloudinary ---------------------- */
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

/* ---------------------- ثوابت الرفع ---------------------- */
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED: ReadonlyArray<string> = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/* ---------------------- أدوات مساعدة ---------------------- */
function errorJson(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function toDataUri(file: File, buf: Buffer): string {
  return `data:${file.type};base64,${buf.toString("base64")}`;
}

/* ---------------------- POST: رفع صورة ---------------------- */
export async function POST(req: NextRequest) {
  try {
    // 🛡️ السماح فقط للأدمن
    const session = await auth();
    const role = session?.user?.role ?? "";

    if (!session || role !== "admin") {
      return errorJson("Unauthorized", 401);
    }

    // استلام ملف من FormData
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return errorJson("No file sent", 400);
    }
    if (!ALLOWED.includes(file.type)) {
      return errorJson("Unsupported type", 415);
    }
    if (file.size > MAX_SIZE) {
      return errorJson("File too large (max 5MB)", 413);
    }

    // تحويل الملف إلى Base64 Data URI (لاستخدام رفع واحد)
    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUri = toDataUri(file, buffer);

    // رفع إلى Cloudinary
    const uploadRes: UploadApiResponse = await cloudinary.uploader.upload(dataUri, {
      folder: "articles",
      resource_type: "image",
      // transformation: [{ quality: "auto", fetch_format: "auto" }], // اختياري
    });

    // استجابة ناجحة
    return NextResponse.json(
      {
        url: uploadRes.secure_url,
        public_id: uploadRes.public_id,
        width: uploadRes.width,
        height: uploadRes.height,
        format: uploadRes.format,
        bytes: uploadRes.bytes,
      },
      { status: 201 }
    );
  } catch (e: unknown) {
    // أخطاء Zod (البيئة)
    if (e instanceof ZodError) {
      return errorJson(e.issues.map((i) => i.message).join(" | "), 500);
    }

    const message = e instanceof Error ? e.message : "Upload failed";
    console.error("UPLOAD ERROR:", e);
    return NextResponse.json({ error: "Upload failed", details: message }, { status: 500 });
  }
}
