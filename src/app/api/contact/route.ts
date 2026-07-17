import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendAdminEnquiryNotification, sendClientEnquiryThankYou } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const { name, email, phone, message } = await req.json();

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
