// Server-safe HTML sanitization
// This avoids the webidl-conversions issue with isomorphic-dompurify in server components

export function sanitizeHtmlServer(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Basic XSS protection - remove script tags and event handlers
  const sanitized = html
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers (onclick, onerror, etc.)
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')
    // Remove javascript: URLs
    .replace(/javascript:/gi, '')
    // Remove data: URLs that aren't images
    .replace(/data:(?!image\/)/gi, '')
    // Remove iframe tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove object/embed tags
    .replace(/<(object|embed)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');

  // For server components, we'll do basic sanitization
  // The content from TipTap editor should already be safe HTML
  // This is a lightweight sanitization for server-side use
  
  return sanitized;
}

