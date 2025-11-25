import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { secureAdminRoute, handleError, addSecurityHeaders } from '@/lib/api-security';

export const dynamic = 'force-dynamic';

export const GET = secureAdminRoute(async (request: NextRequest, user) => {
  try {
    // Fetch all subscribers with their tags
    const subscribers = await db.newsletterSubscriber.findMany({
      include: {
        subscriberTags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Log audit event
    console.log('AUDIT:', {
      userId: user.id,
      userEmail: user.email,
      action: 'subscribers_exported',
      resourceType: 'NewsletterSubscriber',
      resourceId: null,
      details: { count: subscribers.length },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      userAgent: request.headers.get('user-agent') || null,
      timestamp: new Date().toISOString(),
    });

    // Convert to CSV format
    const headers = ['Email', 'Name', 'Subscribed At', 'Tags'];
    const rows = subscribers.map((subscriber: typeof subscribers[0]) => {
      const tags = subscriber.subscriberTags
        .map((st: typeof subscriber.subscriberTags[0]) => st.tag.name)
        .join('; ');
      return [
        subscriber.email,
        subscriber.name || '',
        new Date(subscriber.createdAt).toLocaleString(),
        tags,
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row: typeof rows[0]) => row.map((cell: string | number) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    // Create response with CSV content
    const response = new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="subscribers.csv"',
      },
    });

    return addSecurityHeaders(response);
  } catch (error) {
    return handleError(error, 'Failed to export subscribers');
  }
});
