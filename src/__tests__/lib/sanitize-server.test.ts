import { describe, it, expect } from '@jest/globals';
import { sanitizeHtmlServer } from '@/lib/sanitize-server';

describe('sanitizeHtmlServer', () => {
  it('should return empty string for null or undefined', () => {
    expect(sanitizeHtmlServer(null as unknown as string)).toBe('');
    expect(sanitizeHtmlServer(undefined as unknown as string)).toBe('');
  });

  it('should return empty string for non-string input', () => {
    expect(sanitizeHtmlServer(123 as unknown as string)).toBe('');
    expect(sanitizeHtmlServer({} as unknown as string)).toBe('');
    expect(sanitizeHtmlServer([] as unknown as string)).toBe('');
  });

  it('should remove script tags and their content', () => {
    const html = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
    const result = sanitizeHtmlServer(html);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert("xss")');
    expect(result).toContain('<p>Hello</p>');
    expect(result).toContain('<p>World</p>');
  });

  it('should remove event handlers (onclick, onerror, etc.)', () => {
    const html = '<div onclick="alert(\'xss\')">Click me</div>';
    const result = sanitizeHtmlServer(html);
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('alert');
    expect(result).toContain('<div');
    expect(result).toContain('Click me');
  });

  it('should remove javascript: URLs', () => {
    const html = '<a href="javascript:alert(\'xss\')">Link</a>';
    const result = sanitizeHtmlServer(html);
    expect(result).not.toContain('javascript:');
    expect(result).toContain('<a');
  });

  it('should remove iframe tags', () => {
    const html = '<p>Content</p><iframe src="evil.com"></iframe><p>More</p>';
    const result = sanitizeHtmlServer(html);
    expect(result).not.toContain('<iframe');
    expect(result).toContain('<p>Content</p>');
    expect(result).toContain('<p>More</p>');
  });

  it('should remove object and embed tags', () => {
    const html = '<p>Content</p><object data="evil.swf"></object><embed src="evil.swf"></embed>';
    const result = sanitizeHtmlServer(html);
    expect(result).not.toContain('<object');
    expect(result).not.toContain('<embed');
    expect(result).toContain('<p>Content</p>');
  });

  it('should preserve safe HTML tags', () => {
    const html = '<p>Hello <strong>World</strong></p><ul><li>Item 1</li></ul>';
    const result = sanitizeHtmlServer(html);
    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
  });

  it('should handle multiple XSS attempts', () => {
    const html = `
      <p>Safe content</p>
      <script>alert('xss1')</script>
      <div onclick="alert('xss2')">Click</div>
      <a href="javascript:alert('xss3')">Link</a>
      <iframe src="evil.com"></iframe>
    `;
    const result = sanitizeHtmlServer(html);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('javascript:');
    expect(result).not.toContain('<iframe');
    expect(result).toContain('Safe content');
  });

  it('should handle empty string', () => {
    expect(sanitizeHtmlServer('')).toBe('');
  });

  it('should handle plain text without HTML', () => {
    const text = 'This is plain text without any HTML tags';
    expect(sanitizeHtmlServer(text)).toBe(text);
  });

  it('should handle complex nested XSS attempts', () => {
    const html = '<div><script>alert("xss")</script><p>Content</p></div>';
    const result = sanitizeHtmlServer(html);
    expect(result).not.toContain('<script>');
    expect(result).toContain('<div>');
    expect(result).toContain('<p>Content</p>');
  });
});

