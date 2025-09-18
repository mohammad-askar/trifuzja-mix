// 📁 app/api/newsletter/route.ts
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import nodemailer, { Transporter } from 'nodemailer';
import { z, ZodError } from 'zod';

/* -------------------- Zod Schema (بدون any) -------------------- */
const BodySchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address')
    .max(320),
});

/* -------------- إنشاء Transporter بشكل آمن/كسول -------------- */
let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;

  const user = process.env.EMAIL_USER ?? '';
  const pass = process.env.EMAIL_PASS ?? '';

  if (!user || !pass) {
    throw new Error('Missing EMAIL_USER or EMAIL_PASS env vars');
  }

  // خيار 1: Gmail مع App Password
  cachedTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  // بديل (خيار 2): SMTP مخصّص — فعِّل هذا بدلاً من أعلاه لو عندك SMTP
  // cachedTransporter = nodemailer.createTransport({
  //   host: process.env.SMTP_HOST!,
  //   port: Number(process.env.SMTP_PORT || 587),
  //   secure: false, // true لـ 465
  //   auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  // });

  return cachedTransporter;
}

/* ------------------------------ POST ------------------------------ */
export async function POST(req: NextRequest) {
  try {
    // 1) تحقّق من الجسم
    const { email } = BodySchema.parse(await req.json());

    // 2) جهّز المُرسِل
    const transporter = getTransporter();

    // 3) أرسل رسالة تنبيه للاشتراك الجديد
    const to = process.env.EMAIL_USER!;
    const subject = 'New newsletter subscription';
    const text = `New subscriber: ${email}`;
    const html = `
      <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;line-height:1.5">
        <h2 style="margin:0 0 8px">New newsletter subscription</h2>
        <p style="margin:0">Subscriber email: <strong>${email}</strong></p>
        <hr style="margin:16px 0;border:none;border-top:1px solid #eee" />
        <small style="color:#666">Trifuzja Mix</small>
      </div>
    `;

    await transporter.sendMail({
      from: `"Trifuzja Mix" <${to}>`,
      to,
      subject,
      text,
      html,
      headers: { 'X-Entity-Type': 'newsletter-subscription' },
    });

    // 4) ردّ نجاح
    return NextResponse.json(
      { ok: true, message: 'Subscription successful' },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        { error: e.issues.map((i) => i.message).join(' | ') },
        { status: 400 },
      );
    }
    console.error('POST /api/newsletter error:', e);
    const msg =
      e instanceof Error && /EMAIL_.* env/.test(e.message)
        ? 'Server email not configured'
        : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
