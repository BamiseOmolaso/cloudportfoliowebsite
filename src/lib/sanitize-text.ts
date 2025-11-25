// Text sanitization functions (no DOMPurify dependency)
// Safe for server-side use

export function sanitizeEmail(email: string | undefined | null): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

export function sanitizeSubject(subject: string | undefined | null): string {
  if (!subject) return '';
  return subject.trim().replace(/[<>]/g, '');
}

export function sanitizeText(text: string | undefined | null): string {
  if (!text) return '';
  return text.trim().replace(/[<>]/g, '');
}

