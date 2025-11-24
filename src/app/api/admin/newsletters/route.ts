import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const newsletters = await db.newsletter.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        newsletterSends: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    const transformed = newsletters.map(newsletter => {
      const sentCount = newsletter.newsletterSends.filter(s => s.status === 'sent').length;
      const failedCount = newsletter.newsletterSends.filter(s => s.status === 'failed').length;
      const totalCount = newsletter.newsletterSends.length;

      return {
        id: newsletter.id,
        subject: newsletter.subject,
        status: newsletter.status,
        recipients_count: totalCount,
        sent_count: sentCount,
        failed_count: failedCount,
        created_at: newsletter.createdAt.toISOString(),
        sent_at: newsletter.sentAt?.toISOString() || null,
        scheduled_for: newsletter.scheduledFor?.toISOString() || null,
      };
    });

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Error fetching newsletters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch newsletters' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subject, content, status, scheduled_for } = body;

    if (!subject || !content) {
      return NextResponse.json(
        { error: 'Subject and content are required' },
        { status: 400 }
      );
    }

    const newsletter = await db.newsletter.create({
      data: {
        subject,
        content,
        status: status || 'draft',
        scheduledFor: scheduled_for ? new Date(scheduled_for) : null,
      },
    });

    return NextResponse.json({
      id: newsletter.id,
      subject: newsletter.subject,
      content: newsletter.content,
      status: newsletter.status,
      scheduled_for: newsletter.scheduledFor?.toISOString() || null,
      created_at: newsletter.createdAt.toISOString(),
      updated_at: newsletter.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error creating newsletter:', error);
    return NextResponse.json(
      { error: 'Failed to create newsletter' },
      { status: 500 }
    );
  }
}

