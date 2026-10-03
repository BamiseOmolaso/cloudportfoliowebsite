// src/app/api/newsletter/subscribe/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendWelcomeEmail, sendAdminNotification } from '@/lib/resend';
import { withRateLimit, apiLimiter } from '@/lib/rate-limit';
import {
  isIPBlacklisted,
  trackFailedAttempt,
  isCaptchaRequired,
  verifyCaptcha,
} from '@/lib/security';
import crypto from 'crypto';
import { getClientIp } from "@/lib/client-ip";

function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

function validateInputs(email: string, name: string): { isValid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return { isValid: false, error: 'Please provide a valid email address.' };
  }
  if (name && name.length > 100) {
    return { isValid: false, error: 'Name is too long.' };
  }
  return { isValid: true };
}

export const POST = withRateLimit(apiLimiter, 'newsletter-subscribe', async (req: Request) => {
  const ip = getClientIp(req.headers) || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  if (await isIPBlacklisted(ip)) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  }

  const body = await req.json();
  const email = sanitizeInput(body.email || '');
  const name = sanitizeInput(body.name || '');
  const location = sanitizeInput(body.location || '');

  const { isValid, error } = validateInputs(email, name);
  if (!isValid) {
    await trackFailedAttempt(ip, email, userAgent, 'newsletter_subscribe');
    return NextResponse.json({ error }, { status: 400 });
  }

  // Optional: CAPTCHA check
  if (await isCaptchaRequired(ip, email)) {
    const captchaToken = body.captchaToken;
    if (!captchaToken) {
      await trackFailedAttempt(ip, email, userAgent, 'newsletter_subscribe');
      return NextResponse.json({ error: 'Captcha verification required.', requiresCaptcha: true }, { status: 400 });
    }
    const captchaValid = await verifyCaptcha(captchaToken, ip);
    if (!captchaValid) {
      await trackFailedAttempt(ip, email, userAgent, 'newsletter_subscribe');
      return NextResponse.json({ error: 'Captcha verification failed.' }, { status: 400 });
    }
  }

  // Already on the list and active: answer exactly as for a new signup (so the
  // form cannot be used to find out who is subscribed) but change nothing. No
  // second welcome email, no admin notification, and above all no new tokens:
  // generating them would silently break the unsubscribe and preferences links
  // in the email this person already received.
  const existing = await db.newsletterSubscriber.findUnique({
    where: { email },
    select: { isSubscribed: true, isDeleted: true },
  });
  if (existing?.isSubscribed && !existing.isDeleted) {
    return NextResponse.json({ success: true });
  }

  // Generate tokens
  const unsubscribeToken = crypto.randomBytes(32).toString('hex');
  const preferencesToken = crypto.randomBytes(32).toString('hex');
  const tokenExpiresAt = new Date();
  tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30); // 30 days expiry

  // Upsert via Prisma
  const subscriber = await db.newsletterSubscriber.upsert({
    where: { email },
    update: {
      // A blank name must not erase one we already have.
      ...(name ? { name } : {}),
      location,
      isSubscribed: true,
      subscribedAt: new Date(),
      unsubscribedAt: null,
      subscriptionCount: { increment: 1 },
      updatedAt: new Date(),
      isDeleted: false,
      deletedAt: null,
      deletedReason: null,
      unsubscribeToken,
      unsubscribeTokenExpiresAt: tokenExpiresAt,
      preferencesToken,
      preferencesTokenExpiresAt: tokenExpiresAt,
    },
    create: {
      email,
      name,
      location,
      isSubscribed: true,
      preferences: {
        frequency: 'weekly',
        categories: [],
      },
      unsubscribeToken,
      unsubscribeTokenExpiresAt: tokenExpiresAt,
      preferencesToken,
      preferencesTokenExpiresAt: tokenExpiresAt,
    },
  });

  // Log audit event
  await db.newsletterAuditLog.create({
    data: {
      subscriberId: subscriber.id,
      action: 'subscribed',
      details: { email, name, location },
      ipAddress: ip,
      userAgent,
    },
  });

  // Send welcome email and admin notification
  try {
    await sendWelcomeEmail(subscriber.email, subscriber.name || '', unsubscribeToken, preferencesToken);
    await sendAdminNotification(subscriber.email, subscriber.name || undefined);
  } catch (emailError) {
    console.error('Error sending emails:', emailError);
    // Don't fail the subscription if email fails
  }

  return NextResponse.json({ success: true });
});
