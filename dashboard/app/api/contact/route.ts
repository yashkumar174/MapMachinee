import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, niche, msg } = body;

    if (!name || !email || !msg) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and message are required.' },
        { status: 400 }
      );
    }

    const inquiry = await prisma.inquiry.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        niche: niche || 'General',
        message: msg.trim(),
      },
    });

    return NextResponse.json({ success: true, inquiryId: inquiry.id });
  } catch (error: any) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit inquiry.' },
      { status: 500 }
    );
  }
}
