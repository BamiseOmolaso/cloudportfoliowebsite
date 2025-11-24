import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const subscriber = await db.newsletterSubscriber.findFirst({
      where: {
        unsubscribeToken: token,
        OR: [
          { unsubscribeTokenExpiresAt: null },
          { unsubscribeTokenExpiresAt: { gt: new Date() } }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        isSubscribed: true,
      },
    });

    if (!subscriber) {
      return NextResponse.json(
        { error: 'Invalid or expired unsubscribe token' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      email: subscriber.email,
      name: subscriber.name,
      isSubscribed: subscriber.isSubscribed,
    });
  } catch (error) {
    console.error('Error fetching unsubscribe info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unsubscribe information' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, reason, feedback } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const subscriber = await db.newsletterSubscriber.findFirst({
      where: {
        unsubscribeToken: token,
        OR: [
          { unsubscribeTokenExpiresAt: null },
          { unsubscribeTokenExpiresAt: { gt: new Date() } }
        ]
      },
    });

    if (!subscriber) {
      return NextResponse.json(
        { error: 'Invalid or expired unsubscribe token' },
        { status: 404 }
      );
    }

    await db.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        isSubscribed: false,
        unsubscribeReason: reason || null,
        unsubscribeFeedback: feedback || null,
        updatedAt: new Date(),
      },
    });

    // Log audit event
    await db.newsletterAuditLog.create({
      data: {
        subscriberId: subscriber.id,
        action: 'unsubscribed',
        details: { reason, feedback },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing unsubscribe:', error);
    return NextResponse.json(
      { error: 'Failed to process unsubscribe' },
      { status: 500 }
    );
  }
}

