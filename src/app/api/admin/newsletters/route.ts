import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { secureAdminRoute, handleError, mapPrismaError, sanitizeContent } from '@/lib/api-security';
import { newsletterCreateSchema } from '@/lib/validation-schemas';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export const GET = secureAdminRoute(async (request: NextRequest) => {
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
    return handleError(error, 'Failed to fetch newsletters');
  }
});

export const POST = secureAdminRoute(async (request: NextRequest, user) => {
  try {
    const body = await request.json();

    // Validate input
    const validated = newsletterCreateSchema.parse(body);

    // Sanitize HTML content
    const sanitizedContent = sanitizeContent(validated.content);

    const newsletter = await db.newsletter.create({
      data: {
        subject: validated.subject,
        content: sanitizedContent,
        status: validated.status,
        scheduledFor: validated.scheduled_for ? new Date(validated.scheduled_for) : null,
      },
    });

    // Log audit event
    console.log('AUDIT:', {
      userId: user.id,
      userEmail: user.email,
      action: 'newsletter_created',
      resourceType: 'Newsletter',
      resourceId: newsletter.id,
      details: { subject: newsletter.subject },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      userAgent: request.headers.get('user-agent') || null,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      id: newsletter.id,
      subject: newsletter.subject,
      content: newsletter.content,
      status: newsletter.status,
      scheduled_for: newsletter.scheduledFor?.toISOString() || null,
      created_at: newsletter.createdAt.toISOString(),
      updated_at: newsletter.updatedAt.toISOString(),
    }, { status: 201 });
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
    return handleError(error, 'Failed to create newsletter');
  }
});
