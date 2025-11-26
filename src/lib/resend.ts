// TODO: Add tests - currently 0% coverage
// Priority: High - Email service needs mocking and testing
// Test cases needed: Email sending, error handling, template rendering, Resend API integration

import { Resend } from "resend";
import { db } from "./db";

// Lazy-load Resend client to avoid initialization during build time
let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    // During build time (when RESEND_API_KEY is not set), use a dummy key
    // Resend constructor requires a string, but it won't be used until runtime
    resendInstance = new Resend(apiKey || "re_dummy_key_for_build_time_only");
  }
  return resendInstance;
}

// Get domain from environment variable, fallback for backward compatibility
const DOMAIN = process.env.RESEND_DOMAIN || "oluwabamiseomolaso.com.ng";

export async function sendWelcomeEmail(
  email: string,
  name: string,
  unsubscribeToken: string,
  preferencesToken: string,
) {
  try {
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/unsubscribe?token=${unsubscribeToken}`;
    const preferencesUrl = `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/newsletter/preferences?token=${preferencesToken}`;

    const subscriber = await db.newsletterSubscriber.findUnique({
      where: { email },
      select: { unsubscribeReason: true, unsubscribeFeedback: true },
    });

    const isResubscription = subscriber?.unsubscribeReason != null;
    const firstName = name.split(" ")[0];

    const { data, error } = await getResend().emails.send({
      from: `Bamise Omolaso <${process.env.RESEND_FROM_EMAIL}>`,
      replyTo:
        process.env.CONTACT_EMAIL ||
        process.env.RESEND_FROM_EMAIL ||
        (() => {
          console.error("CONTACT_EMAIL or RESEND_FROM_EMAIL must be set");
          return "noreply@example.com"; // Fallback for development only
        })(),
      to: email,
      subject: isResubscription
        ? `Welcome back, ${firstName}`
        : `Welcome, ${firstName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4F46E5; margin-bottom: 24px;">Welcome to My Newsletter!</h1>
          
          <p>Hi ${firstName},</p>
          
          ${
            isResubscription
              ? `
            <p>I'm glad to have you back! I've been working on creating valuable content, and I'm excited to share it with you.</p>
            <p>You'll be the first to receive my latest insights and updates.</p>
          `
              : `
            <p>Thank you for joining my community. I'm excited to share my insights and updates with you.</p>
            <p>You'll receive updates about:</p>
            <ul>
              <li>Healthcare data science applications</li>
              <li>AI developments in medicine</li>
              <li>Cloud technology in healthcare</li>
            </ul>
          `
          }

          <p>Feel free to reply to this email if you have any questions.</p>
          
          <p>Best regards,<br>Bamise</p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;">
            <p style="margin-bottom: 10px;">
              <a href="${preferencesUrl}" style="color: #4F46E5; text-decoration: none; margin: 0 10px;">Update Preferences</a> | 
              <a href="${unsubscribeUrl}" style="color: #4F46E5; text-decoration: none; margin: 0 10px;">Unsubscribe</a>
            </p>
            <p style="margin-top: 10px;">
              Lagos, Nigeria
            </p>
          </div>
        </div>
      `,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        Precedence: "bulk",
        "X-Auto-Response-Suppress": "OOF",
      },
    });

    if (error) {
      console.error("Error sending welcome email:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in sendWelcomeEmail:", error);
    throw error;
  }
}

export async function sendAdminNotification(email: string, name?: string) {
  try {
    // Get total subscriber count and location data
    const subscribers = await db.newsletterSubscriber.findMany({
      where: { isSubscribed: true, isDeleted: false },
      select: { id: true, createdAt: true, location: true },
    });

    // Calculate subscriber growth
    const totalSubscribers = subscribers.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newSubscribersToday = subscribers.filter(
      (sub: (typeof subscribers)[0]) => sub.createdAt >= today,
    ).length;

    // Get location statistics
    const locationStats = subscribers.reduce(
      (acc: Record<string, number>, sub: (typeof subscribers)[0]) => {
        const location = sub.location || "Unknown";
        acc[location] = (acc[location] || 0) + 1;
        return acc;
      },
      {},
    );

    const locationList = Object.entries(locationStats)
      .map(([location, count]) => `${location}: ${count}`)
      .join("<br>");

    const contactEmail = process.env.CONTACT_EMAIL;
    if (!contactEmail) {
      throw new Error("CONTACT_EMAIL environment variable must be set");
    }

    const { data, error } = await getResend().emails.send({
      from: `Bamise Omolaso <${process.env.RESEND_FROM_EMAIL}>`,
      to: contactEmail,
      subject: "🎉 New Newsletter Subscriber!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4F46E5;">New Newsletter Subscriber!</h1>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0;">
              <strong>Email:</strong> ${email}
            </p>
            ${
              name
                ? `
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 10px 0 0 0;">
              <strong>Name:</strong> ${name}
            </p>
            `
                : ""
            }
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 10px 0 0 0;">
              <strong>Subscribed at:</strong> ${new Date().toLocaleString()}
            </p>
          </div>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #4F46E5; font-size: 18px; margin-bottom: 10px;">Subscriber Statistics</h2>
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 0;">
              <strong>Total Subscribers:</strong> ${totalSubscribers}
            </p>
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 10px 0 0 0;">
              <strong>New Subscribers Today:</strong> ${newSubscribersToday}
            </p>
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin: 10px 0 0 0;">
              <strong>Subscriber Locations:</strong>
            </p>
            <div style="margin-top: 10px; padding-left: 20px;">
              ${locationList}
            </div>
          </div>

          <p style="font-size: 16px; line-height: 1.5; color: #333;">
            Someone has subscribed to your newsletter! 🎉
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Error sending admin notification:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in sendAdminNotification:", error);
    throw error;
  }
}

export async function setupEmailAuthentication() {
  try {
    // Get domain authentication status
    const { data: domainStatus, error: statusError } =
      await getResend().domains.get(DOMAIN);

    if (statusError) {
      console.error("Error getting domain status:", statusError);
      return null;
    }

    if (!domainStatus) {
      // Domain not authenticated, let's set it up
      const { data: domain, error: setupError } =
        await getResend().domains.create({
          name: DOMAIN,
          region: "us-east-1",
        });

      if (setupError) {
        console.error("Error setting up domain:", setupError);
        return null;
      }

      if (!domain) {
        console.error("Invalid domain setup response:", domain);
        return null;
      }

      return {
        status: domain.status,
        records: domain.records,
      };
    }

    return {
      status: domainStatus.status,
      records: domainStatus.records,
    };
  } catch (error) {
    console.error("Error in email authentication setup:", error);
    return null;
  }
}

export async function verifyEmailAuthentication() {
  try {
    const { data: domain, error } = await getResend().domains.verify(DOMAIN);

    if (error) {
      console.error("Error verifying domain:", error);
      return false;
    }

    if (!domain) {
      console.error("Invalid domain verification response");
      return false;
    }

    // The domain verification response should have a success property
    return true;
  } catch (error) {
    console.error("Error in email authentication verification:", error);
    return false;
  }
}

export async function getEmailAuthenticationStatus() {
  try {
    const { data: domain, error } = await getResend().domains.get(DOMAIN);

    if (error) {
      console.error("Error getting domain status:", error);
      return null;
    }

    if (!domain) {
      console.error("Invalid domain status response");
      return null;
    }

    return {
      status: domain.status,
      records: domain.records,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error getting email authentication status:", error);
    return null;
  }
}

export { getResend as resend };
