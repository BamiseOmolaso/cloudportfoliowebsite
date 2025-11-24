/**
 * Example test file to verify Jest setup
 * This file can be deleted once real tests are added
 */

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

