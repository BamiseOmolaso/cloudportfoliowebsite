import { db } from './db';

// Check if IP is blacklisted
export async function isIPBlacklisted(ip: string): Promise<boolean> {
  const now = new Date();
  
  const blacklisted = await db.blacklistedIp.findFirst({
    where: {
      ipAddress: ip,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } }
      ]
    }
  });

  return blacklisted !== null;
}

// Add IP to blacklist
export async function blacklistIP(ip: string, reason: string, expiresAt: Date | null = null): Promise<void> {
  if (!expiresAt) {
    const defaultExpiresAt = new Date();
    defaultExpiresAt.setHours(defaultExpiresAt.getHours() + 24);
    expiresAt = defaultExpiresAt;
  }

  await db.blacklistedIp.upsert({
    where: { ipAddress: ip },
    update: {
      reason,
      expiresAt,
      createdAt: new Date(),
    },
    create: {
      ipAddress: ip,
      reason,
      expiresAt,
      createdBy: 'system',
    },
  });
}

// Track failed attempt
export async function trackFailedAttempt(
  ip: string, 
  email: string, 
  userAgent: string, 
  actionType = 'newsletter_subscribe'
): Promise<void> {
  await db.failedAttempt.create({
    data: {
      ipAddress: ip,
      email,
      userAgent,
      actionType,
      timestamp: new Date(),
    },
  });
}

// Check if CAPTCHA is required
export async function isCaptchaRequired(ip: string, email?: string): Promise<boolean> {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const whereClause: any = {
    timestamp: { gte: oneHourAgo },
    OR: [{ ipAddress: ip }],
  };

  if (email) {
    whereClause.OR.push({ email });
  }

  const recentAttempts = await db.failedAttempt.findMany({
    where: whereClause,
    orderBy: { timestamp: 'desc' },
    take: 5,
  });

  if (recentAttempts.length < 3) return false;

  const oldestAttempt = recentAttempts[recentAttempts.length - 1].timestamp;
  const now = new Date();
  const hoursSinceOldest = (now.getTime() - oldestAttempt.getTime()) / (1000 * 60 * 60);

  return hoursSinceOldest < 1; // Require CAPTCHA if 3+ attempts in last hour
}

// Verify CAPTCHA token
export async function verifyCaptcha(token: string, ip?: string): Promise<boolean> {
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}${ip ? `&remoteip=${ip}` : ''}`,
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Error verifying CAPTCHA:', error);
    return false;
  }
}

// Clean up old records
export async function cleanupOldRecords(): Promise<void> {
  const now = new Date();
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  // Remove expired blacklisted IPs
  await db.blacklistedIp.deleteMany({
    where: {
      expiresAt: { lt: now },
    },
  });

  // Remove failed attempts older than 24 hours
  await db.failedAttempt.deleteMany({
    where: {
      timestamp: { lt: oneDayAgo },
    },
  });
} 