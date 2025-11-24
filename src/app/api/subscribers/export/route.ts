import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
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

    // Convert to CSV format
    const headers = ['Email', 'Name', 'Subscribed At', 'Tags'];
    const rows = subscribers.map(subscriber => {
      const tags = subscriber.subscriberTags
        .map((st) => st.tag.name)
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
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // Create response with CSV content
    const response = new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="subscribers.csv"',
      },
    });

    return response;
  } catch (err: unknown) {
    console.error('Error exporting subscribers:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to export subscribers' },
      { status: 500 }
    );
  }
}
