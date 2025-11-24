import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  slugify,
  formatDate,
  truncateText,
  debounce,
  classNames,
  generateRandomString,
  isValidEmail,
  getInitials,
} from '@/lib/utils';

describe('slugify', () => {
  it('should convert text to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('TEST STRING')).toBe('test-string');
  });

  it('should replace spaces with hyphens', () => {
    expect(slugify('hello world')).toBe('hello-world');
    expect(slugify('multiple   spaces')).toBe('multiple-spaces');
  });

  it('should remove non-word characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
    expect(slugify('Test@String#123')).toBe('teststring123');
  });

  it('should replace multiple hyphens with single hyphen', () => {
    expect(slugify('hello---world')).toBe('hello-world');
    expect(slugify('test---string---test')).toBe('test-string-test');
  });

  it('should trim hyphens from start and end', () => {
    expect(slugify('-hello-world-')).toBe('hello-world');
    expect(slugify('---test---')).toBe('test');
  });

  it('should handle empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('should handle string with only special characters', () => {
    expect(slugify('!!!@@@###')).toBe('');
  });

  it('should handle numbers', () => {
    expect(slugify('Test 123 String')).toBe('test-123-string');
  });

  it('should handle mixed case and special characters', () => {
    expect(slugify('Hello, World! 123')).toBe('hello-world-123');
  });
});

describe('formatDate', () => {
  it('should format date string correctly', () => {
    const date = new Date('2024-01-15');
    const result = formatDate(date);
    expect(result).toContain('January');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('should format ISO date string', () => {
    const result = formatDate('2024-12-25T00:00:00.000Z');
    expect(result).toContain('December');
    expect(result).toContain('25');
    expect(result).toContain('2024');
  });

  it('should handle Date object', () => {
    const date = new Date('2023-06-10');
    const result = formatDate(date);
    expect(result).toContain('June');
    expect(result).toContain('10');
    expect(result).toContain('2023');
  });
});

describe('truncateText', () => {
  it('should truncate text longer than length', () => {
    const text = 'This is a very long text that should be truncated';
    expect(truncateText(text, 20)).toBe('This is a very long ...');
    expect(truncateText(text, 10)).toBe('This is a ...');
  });

  it('should not truncate text shorter than length', () => {
    const text = 'Short text';
    expect(truncateText(text, 20)).toBe('Short text');
    expect(truncateText(text, 10)).toBe('Short text');
  });

  it('should handle empty string', () => {
    expect(truncateText('', 10)).toBe('');
  });

  it('should handle text exactly equal to length', () => {
    const text = 'Exactly ten';
    expect(truncateText(text, 11)).toBe('Exactly ten');
  });

  it('should add ellipsis when truncating', () => {
    const text = 'This is a test';
    expect(truncateText(text, 5)).toBe('This ...');
  });
});

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should delay function execution', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should cancel previous calls if called again', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    jest.advanceTimersByTime(50);
    debouncedFn();
    jest.advanceTimersByTime(50);
    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(50);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments to debounced function', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn('arg1', 'arg2');
    jest.advanceTimersByTime(100);

    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('classNames', () => {
  it('should join valid class names', () => {
    expect(classNames('class1', 'class2', 'class3')).toBe('class1 class2 class3');
  });

  it('should filter out falsy values', () => {
    expect(classNames('class1', null, 'class2', undefined, false, 'class3')).toBe('class1 class2 class3');
  });

  it('should handle empty array', () => {
    expect(classNames()).toBe('');
  });

  it('should handle only falsy values', () => {
    expect(classNames(null, undefined, false, '')).toBe('');
  });

  it('should handle boolean values', () => {
    expect(classNames('class1', true && 'class2', false && 'class3')).toBe('class1 class2');
  });
});

describe('generateRandomString', () => {
  it('should generate string of specified length', () => {
    const result = generateRandomString(10);
    expect(result).toHaveLength(10);
  });

  it('should generate different strings on each call', () => {
    const result1 = generateRandomString(20);
    const result2 = generateRandomString(20);
    // Very unlikely to be the same (1 in 62^20)
    expect(result1).not.toBe(result2);
  });

  it('should only contain alphanumeric characters', () => {
    const result = generateRandomString(100);
    expect(result).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('should handle length of 0', () => {
    expect(generateRandomString(0)).toBe('');
  });

  it('should handle length of 1', () => {
    const result = generateRandomString(1);
    expect(result).toHaveLength(1);
    expect(result).toMatch(/^[A-Za-z0-9]$/);
  });
});

describe('isValidEmail', () => {
  it('should validate correct email addresses', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    expect(isValidEmail('admin@subdomain.example.com')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('user @domain.com')).toBe(false);
  });

  it('should handle empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('should handle string with only spaces', () => {
    expect(isValidEmail('   ')).toBe(false);
  });
});

describe('getInitials', () => {
  it('should get initials from full name', () => {
    expect(getInitials('John Doe')).toBe('JD');
    expect(getInitials('Jane Smith')).toBe('JS');
  });

  it('should handle single name', () => {
    expect(getInitials('John')).toBe('J');
    expect(getInitials('Smith')).toBe('S');
  });

  it('should handle multiple words', () => {
    expect(getInitials('John Michael Smith')).toBe('JMS');
    expect(getInitials('Mary Jane Watson')).toBe('MJW');
  });

  it('should convert to uppercase', () => {
    expect(getInitials('john doe')).toBe('JD');
    expect(getInitials('JANE smith')).toBe('JS');
  });

  it('should handle empty string', () => {
    expect(getInitials('')).toBe('');
  });

  it('should handle string with only spaces', () => {
    expect(getInitials('   ')).toBe('');
  });
});

