// src/lib/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'div'],
    ALLOWED_ATTR: ['href', 'style']
  });
}

export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function sanitizeSubject(subject: string): string {
  return subject.trim().replace(/[<>]/g, '');
}

export function sanitizeText(text: string): string {
  return text.trim().replace(/[<>]/g, '');
}