// Text sanitization functions (no DOMPurify dependency)
// Safe for server-side use

export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function sanitizeSubject(subject: string): string {
  return subject.trim().replace(/[<>]/g, '');
}

export function sanitizeText(text: string): string {
  return text.trim().replace(/[<>]/g, '');
}

