import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendAdminEnquiryNotification, sendClientEnquiryThankYou } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 200) : '';
    const email = typeof body?.email === 'string' ? body.email.trim().slice(0, 200) : '';
    const phone = typeof body?.phone === 'string' ? body.phone.trim().slice(0, 60) : '';
    const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 5000) : '';

    if (!name || !email || !phone || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Save to Database
    const enquiry = await prisma.enquiry.create({
      data: {
        name,
        email,
        phone,
        message,
        source: 'Contact Form',
      },
    });

    // Send Emails (Don't await them to speed up response, but catch errors)
    Promise.all([
      sendAdminEnquiryNotification({ name, email, phone, message, source: 'Contact Form' }),
      sendClientEnquiryThankYou({ name, email })
    ]).catch(err => {
      console.error('Email sending failed for enquiry:', err);
    });

    return NextResponse.json({ success: true, enquiryId: enquiry.id });
  } catch (error: any) {
    console.error('Contact API Error:', error);
    return NextResponse.json(
      { error: 'Failed to submit enquiry. Please try again later.' },
      { status: 500 }
    );
  }
}
