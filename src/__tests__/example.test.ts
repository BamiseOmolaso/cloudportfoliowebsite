import { describe, it, expect } from '@jest/globals';

describe('Jest Setup', () => {
  it('should run tests successfully', () => {
    expect(true).toBe(true);
  });

  it('should handle basic math', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle string operations', () => {
    const str = 'Hello, World!';
    expect(str.toLowerCase()).toBe('hello, world!');
  });
});

