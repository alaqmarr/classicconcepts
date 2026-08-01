import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { path } = body;

    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    // Upsert the page visit count
    await prisma.pageVisit.upsert({
      where: { path },
      update: { visits: { increment: 1 } },
      create: { path, visits: 1 },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed to update analytics' }, { status: 500 });
  }
}
