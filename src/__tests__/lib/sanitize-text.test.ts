import { describe, it, expect } from '@jest/globals';
import { sanitizeEmail, sanitizeSubject, sanitizeText } from '@/lib/sanitize-text';

describe('sanitizeEmail', () => {
  it('should trim whitespace from email', () => {
    expect(sanitizeEmail('  test@example.com  ')).toBe('test@example.com');
    expect(sanitizeEmail('  user@domain.com')).toBe('user@domain.com');
    expect(sanitizeEmail('admin@site.com  ')).toBe('admin@site.com');
  });

  it('should convert email to lowercase', () => {
    expect(sanitizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
    expect(sanitizeEmail('User@Domain.Com')).toBe('user@domain.com');
    expect(sanitizeEmail('ADMIN@SITE.COM')).toBe('admin@site.com');
  });

  it('should handle emails with mixed case and whitespace', () => {
    expect(sanitizeEmail('  Test@Example.COM  ')).toBe('test@example.com');
    expect(sanitizeEmail('  USER@DOMAIN.com  ')).toBe('user@domain.com');
  });

  it('should handle empty string', () => {
    expect(sanitizeEmail('')).toBe('');
  });

  it('should handle string with only whitespace', () => {
    expect(sanitizeEmail('   ')).toBe('');
  });
});

describe('sanitizeSubject', () => {
  it('should trim whitespace from subject', () => {
    expect(sanitizeSubject('  Hello World  ')).toBe('Hello World');
    expect(sanitizeSubject('  Test Subject')).toBe('Test Subject');
    expect(sanitizeSubject('Subject Text  ')).toBe('Subject Text');
  });

  it('should remove angle brackets', () => {
    expect(sanitizeSubject('Hello <script>alert("xss")</script>')).toBe('Hello scriptalert("xss")/script');
    expect(sanitizeSubject('<div>Test</div>')).toBe('divTest/div');
    expect(sanitizeSubject('Subject > Content')).toBe('Subject  Content');
  });

  it('should handle multiple angle brackets', () => {
    expect(sanitizeSubject('<<<Test>>>')).toBe('Test');
    expect(sanitizeSubject('<a><b>Content</b></a>')).toBe('abContent/b/a');
  });

  it('should handle empty string', () => {
    expect(sanitizeSubject('')).toBe('');
  });

  it('should handle string with only angle brackets and whitespace', () => {
    expect(sanitizeSubject('  <><>  ')).toBe('');
  });
});

describe('sanitizeText', () => {
  it('should trim whitespace from text', () => {
    expect(sanitizeText('  Hello World  ')).toBe('Hello World');
    expect(sanitizeText('  Test Text')).toBe('Test Text');
    expect(sanitizeText('Text Content  ')).toBe('Text Content');
  });

  it('should remove angle brackets', () => {
    expect(sanitizeText('Hello <script>alert("xss")</script>')).toBe('Hello scriptalert("xss")/script');
    expect(sanitizeText('<div>Test</div>')).toBe('divTest/div');
    expect(sanitizeText('Text > Content')).toBe('Text  Content');
  });

  it('should handle multiple angle brackets', () => {
    expect(sanitizeText('<<<Test>>>')).toBe('Test');
    expect(sanitizeText('<a><b>Content</b></a>')).toBe('abContent/b/a');
  });

  it('should handle empty string', () => {
    expect(sanitizeText('')).toBe('');
  });

  it('should handle multiline text', () => {
    const multiline = '  Line 1\n  Line 2  ';
    expect(sanitizeText(multiline)).toBe('Line 1\n  Line 2');
  });
});

