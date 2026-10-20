import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendAdminReply } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const { enquiryId, message, channel } = await req.json();

    if (!enquiryId) {
      return NextResponse.json({ error: 'Missing enquiry ID' }, { status: 400 });
    }

    const enquiry = await prisma.enquiry.findUnique({
      where: { id: enquiryId }
    });

    if (!enquiry) {
      return NextResponse.json({ error: 'Enquiry not found' }, { status: 404 });
    }

    if (channel !== 'whatsapp') {
      if (!message) {
        return NextResponse.json({ error: 'Missing reply message' }, { status: 400 });
      }
      // Send the email
      await sendAdminReply({
        name: enquiry.name,
        email: enquiry.email,
        replyMessage: message,
        originalMessage: enquiry.message
      });
    }

    // Update status to Replied
    await prisma.enquiry.update({
      where: { id: enquiryId },
      data: { status: 'Replied' }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Enquiry reply error:', error);
    return NextResponse.json(
      { error: 'Failed to send reply' },
      { status: 500 }
    );
  }
}
