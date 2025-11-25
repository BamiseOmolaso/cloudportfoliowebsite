import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic'

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
        preferencesToken: token,
        isSubscribed: true,
        isDeleted: false,
        OR: [
          { preferencesTokenExpiresAt: null },
          { preferencesTokenExpiresAt: { gt: new Date() } }
        ]
      },
      select: {
        email: true,
        name: true,
        preferences: true,
      },
    });

    if (!subscriber) {
      return NextResponse.json(
        { error: 'Subscriber not found or token expired' },
        { status: 404 }
      );
    }

    return NextResponse.json(subscriber);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { token, name, preferences } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const subscriber = await db.newsletterSubscriber.findFirst({
      where: {
        preferencesToken: token,
        isSubscribed: true,
        isDeleted: false,
        OR: [
          { preferencesTokenExpiresAt: null },
          { preferencesTokenExpiresAt: { gt: new Date() } }
        ]
      },
    });

    if (!subscriber) {
      return NextResponse.json(
        { error: 'Subscriber not found or token expired' },
        { status: 404 }
      );
    }

    await db.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        name: name !== undefined ? name : subscriber.name,
        preferences: preferences || subscriber.preferences,
        updatedAt: new Date(),
      },
    });

    // Log audit event
    await db.newsletterAuditLog.create({
      data: {
        subscriberId: subscriber.id,
        action: 'preferences_updated',
        details: { name, preferences },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}

