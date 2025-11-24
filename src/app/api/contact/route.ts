import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { withRateLimit, contactFormLimiter } from '@/lib/rate-limit';
import { sanitizeEmail, sanitizeSubject, sanitizeText } from '@/lib/sanitize-text';
import { sanitizeHtmlServer } from '@/lib/sanitize-server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const POST = withRateLimit(contactFormLimiter, 'contact-form', async (request: Request) => {
  try {
    const { name, email, subject, message } = await request.json();

    // Sanitize inputs
    const sanitizedEmail = sanitizeEmail(email);
    const sanitizedSubject = sanitizeSubject(subject);
    const sanitizedMessage = sanitizeText(message);
    const sanitizedName = sanitizeText(name);

    // Validate required fields
    if (!sanitizedName || !sanitizedEmail || !sanitizedMessage) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Save to database using Prisma
    try {
      await db.contactMessage.create({
        data: {
          name: sanitizedName,
          email: sanitizedEmail,
          subject: sanitizedSubject || null,
          message: sanitizedMessage,
          read: false,
          replied: false,
        }
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save message' },
        { status: 500 }
      );
    }

    // Initialize Resend client
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Generate a personalized response
    const responseMessage = generatePersonalizedResponse(sanitizedName, sanitizedSubject || '', sanitizedMessage);

    // Send email notification to admin
    try {
      const contactEmail = process.env.CONTACT_EMAIL;
      if (!contactEmail) {
        throw new Error('CONTACT_EMAIL environment variable must be set');
      }

      await resend.emails.send({
        from: `Bamise Omolaso <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
        to: contactEmail,
        subject: `New Contact Form Submission: ${sanitizedSubject || 'No Subject'}`,
        html: sanitizeHtmlServer(`
          <h2>New Contact Form Submission</h2>
          <p><strong>From:</strong> ${sanitizedName} (${sanitizedEmail})</p>
          <p><strong>Subject:</strong> ${sanitizedSubject || 'No Subject'}</p>
          <p><strong>Message:</strong></p>
          <p>${sanitizedMessage.replace(/\n/g, '<br>')}</p>
        `)
      });
    } catch (err: unknown) {
      console.error('Admin email error:', err instanceof Error ? err.message : err);
    }

    // Send response email to the user
    try {
      await resend.emails.send({
        from: `Bamise Omolaso <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
        to: sanitizedEmail,
        subject: `Re: ${sanitizedSubject || 'Your Message'}`,
        html: sanitizeHtmlServer(responseMessage)
      });
    } catch (err: unknown) {
      console.error('Response email error:', err instanceof Error ? err.message : err);
    }

    return NextResponse.json({ message: 'Message sent successfully' });
  } catch (err: unknown) {
    console.error('Contact form error:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to process request' },
      { status: 500 }
    );
  }
});

function generatePersonalizedResponse(name: string, subject: string, message: string): string {
  const firstName = name.split(' ')[0];
  const lowerSubject = subject.toLowerCase();
  const lowerMessage = message.toLowerCase();
  
  let responseContent = '';
  
  if (lowerSubject.includes('job') || lowerSubject.includes('opportunity') || 
      lowerSubject.includes('collaboration') || lowerSubject.includes('work together') ||
      lowerMessage.includes('job') || lowerMessage.includes('opportunity') || 
      lowerMessage.includes('collaboration') || lowerMessage.includes('work together')) {
    responseContent = `
      <p>Thank you for your interest in working together! I'm always excited to explore new opportunities and collaborations.</p>
      <p>I've received your message and will review it carefully. I'll get back to you with more specific information about how we might work together.</p>
      <p>In the meantime, feel free to check out my portfolio to see more of my work.</p>
    `;
  } else if (lowerSubject.includes('project') || lowerMessage.includes('project')) {
    responseContent = `
      <p>Thank you for your interest in my projects! I appreciate you taking the time to reach out.</p>
      <p>I've received your message and will review it carefully. I'll get back to you with more specific information about the project you mentioned.</p>
      <p>If you have any specific requirements or questions in the meantime, feel free to send a follow-up email.</p>
    `;
  } else if (lowerSubject.includes('question') || lowerSubject.includes('help') || 
             lowerMessage.includes('question') || lowerMessage.includes('help')) {
    responseContent = `
      <p>Thank you for your question! I appreciate you taking the time to reach out.</p>
      <p>I've received your message and will review it carefully. I'll get back to you with a detailed response as soon as possible.</p>
      <p>If you have any additional questions in the meantime, feel free to send a follow-up email.</p>
    `;
  } else {
    responseContent = `
      <p>Thank you for reaching out! I appreciate you taking the time to contact me.</p>
      <p>I've received your message and will review it carefully. I'll get back to you with a more detailed response as soon as possible.</p>
      <p>If you have any additional information to share in the meantime, feel free to send a follow-up email.</p>
    `;
  }
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <h2 style="color: #4f46e5;">Thank you for your message, ${firstName}!</h2>
      ${responseContent}
      <p>Best regards,<br>Bamise Omolaso</p>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
        <p>This is an automated response to your contact form submission. I'll respond more personally soon.</p>
      </div>
    </div>
  `;
}