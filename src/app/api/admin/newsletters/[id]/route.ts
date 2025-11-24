import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { secureAdminRoute, handleError, mapPrismaError, sanitizeContent } from '@/lib/api-security';
import { newsletterUpdateSchema } from '@/lib/validation-schemas';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

async function getHandler(request: NextRequest, user: { id: string; email: string; role: string }, id: string) {
  try {
    const newsletter = await db.newsletter.findUnique({
      where: { id },
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
    if (error && typeof error === 'object' && 'code' in error) {
      const { message, status } = mapPrismaError(error);
      return NextResponse.json({ error: message }, { status });
    }
    return handleError(error, 'Failed to fetch newsletter');
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return secureAdminRoute((req, user) => getHandler(req, user, id))(request);
}

async function putHandler(request: NextRequest, user: { id: string; email: string; role: string }, id: string) {
  try {
    const body = await request.json();

    // Validate input
    const validated = newsletterUpdateSchema.parse(body);

    const existing = await db.newsletter.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Newsletter not found' },
        { status: 404 }
      );
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (validated.subject !== undefined) updateData.subject = validated.subject;
    if (validated.content !== undefined) updateData.content = sanitizeContent(validated.content);
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.scheduled_for !== undefined) {
      updateData.scheduledFor = validated.scheduled_for ? new Date(validated.scheduled_for) : null;
    }

    const newsletter = await db.newsletter.update({
      where: { id },
      data: updateData,
    });

    // Log audit event
    console.log('AUDIT:', {
      userId: user.id,
      userEmail: user.email,
      action: 'newsletter_updated',
      resourceType: 'Newsletter',
      resourceId: newsletter.id,
      details: { subject: newsletter.subject },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      userAgent: request.headers.get('user-agent') || null,
      timestamp: new Date().toISOString(),
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    if (error && typeof error === 'object' && 'code' in error) {
      const { message, status } = mapPrismaError(error);
      return NextResponse.json({ error: message }, { status });
    }
    return handleError(error, 'Failed to update newsletter');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return secureAdminRoute((req, user) => putHandler(req, user, id))(request);
}
