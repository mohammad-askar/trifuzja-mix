import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Trifuzja Mix" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // البريد الذي تستقبل عليه الإشعارات
      subject: 'New Newsletter Subscription',
      text: `New subscriber: ${email}`,
    });

    return NextResponse.json({ message: 'Subscription successful' }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
