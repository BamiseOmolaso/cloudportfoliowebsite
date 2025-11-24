import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const newsletter = await db.newsletter.findUnique({
      where: { id: params.id },
      include: {
        newsletterSends: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!newsletter) {
      return NextResponse.json(
        { error: 'Newsletter not found' },
        { status: 404 }
      );
    }

    const sentCount = newsletter.newsletterSends.filter(s => s.status === 'sent').length;
    const totalCount = newsletter.newsletterSends.length;

    const transformed = {
      id: newsletter.id,
      subject: newsletter.subject,
      content: newsletter.content,
      status: newsletter.status,
      scheduled_for: newsletter.scheduledFor?.toISOString() || null,
      created_at: newsletter.createdAt.toISOString(),
      sent_at: newsletter.sentAt?.toISOString() || null,
      recipients_count: totalCount,
      sent_count: sentCount,
    };

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Error fetching newsletter:', error);
    return NextResponse.json(
      { error: 'Failed to fetch newsletter' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { subject, content, status, scheduled_for } = body;

    const existing = await db.newsletter.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Newsletter not found' },
        { status: 404 }
      );
    }

    const updateData: any = {
      subject: subject ?? existing.subject,
      content: content ?? existing.content,
      status: status ?? existing.status,
      updatedAt: new Date(),
    };

    if (scheduled_for !== undefined) {
      updateData.scheduledFor = scheduled_for ? new Date(scheduled_for) : null;
    }

    const newsletter = await db.newsletter.update({
      where: { id: params.id },
      data: updateData,
    });

    const transformed = {
      id: newsletter.id,
      subject: newsletter.subject,
      content: newsletter.content,
      status: newsletter.status,
      scheduled_for: newsletter.scheduledFor?.toISOString() || null,
      created_at: newsletter.createdAt.toISOString(),
      sent_at: newsletter.sentAt?.toISOString() || null,
    };

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Error updating newsletter:', error);
    return NextResponse.json(
      { error: 'Failed to update newsletter' },
      { status: 500 }
    );
  }
}
