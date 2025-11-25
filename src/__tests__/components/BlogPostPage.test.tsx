import { describe, it, expect, beforeEach, beforeAll, jest } from '@jest/globals';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

type AsyncMock<Args extends any[] = any[], Return = unknown> = jest.MockedFunction<
  (...args: Args) => Promise<Return>
>;

const mockFindFirst: AsyncMock = jest.fn();

// Mock dependencies
jest.mock('@/lib/db', () => ({
  db: {
    blogPost: {
      findFirst: mockFindFirst,
    },
  },
}));
jest.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
}));
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  ),
}));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

type BlogPageModule = typeof import('@/app/blog/[slug]/page');
let BlogPostPage: BlogPageModule['default'];

beforeAll(async () => {
  ({ default: BlogPostPage } = await import('@/app/blog/[slug]/page'));
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BlogPostPage', () => {
  it('should render blog post with all content', async () => {
    const mockPost = {
      id: 'post-123',
      title: 'Test Blog Post',
      slug: 'test-blog-post',
      excerpt: 'Test excerpt',
      content: '<p>Test content</p>',
      coverImage: 'https://example.com/image.jpg',
      metaTitle: 'Test Meta Title',
      metaDescription: 'Test meta description',
      tags: ['test', 'blog'],
      author: 'Test Author',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      status: 'published' as const,
    };

    mockFindFirst.mockResolvedValue(mockPost);

    const params = Promise.resolve({ slug: 'test-blog-post' });
    const component = await BlogPostPage({ params });

    const { container } = render(component);

    expect(container).toHaveTextContent('Test Blog Post');
    expect(container).toHaveTextContent('Test Author');
    expect(container).toHaveTextContent('test');
    expect(container).toHaveTextContent('blog');
  });

  it('should call notFound when post does not exist', async () => {
    mockFindFirst.mockResolvedValue(null);

    const params = Promise.resolve({ slug: 'non-existent' });

    await expect(BlogPostPage({ params })).rejects.toThrow('NOT_FOUND');
  });

  it('should handle JSON string content', async () => {
    const mockPost = {
      id: 'post-123',
      title: 'Test Blog Post',
      slug: 'test-blog-post',
      excerpt: 'Test excerpt',
      content: JSON.stringify({ content: '<p>Parsed content</p>' }),
      coverImage: null,
      metaTitle: null,
      metaDescription: null,
      tags: [],
      author: 'Test Author',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      status: 'published' as const,
    };

    mockFindFirst.mockResolvedValue(mockPost);

    const params = Promise.resolve({ slug: 'test-blog-post' });
    const component = await BlogPostPage({ params });

    const { container } = render(component);

    expect(container).toHaveTextContent('Test Blog Post');
  });

  it('should sanitize HTML content', async () => {
    const mockPost = {
      id: 'post-123',
      title: 'Test Blog Post',
      slug: 'test-blog-post',
      excerpt: 'Test excerpt',
      content: '<p>Safe content</p><script>alert("xss")</script>',
      coverImage: null,
      metaTitle: null,
      metaDescription: null,
      tags: [],
      author: 'Test Author',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      status: 'published' as const,
    };

    mockFindFirst.mockResolvedValue(mockPost);

    const params = Promise.resolve({ slug: 'test-blog-post' });
    const component = await BlogPostPage({ params });

    const { container } = render(component);

    // Script tag should be removed by sanitization
    expect(container.innerHTML).not.toContain('<script>');
    expect(container.innerHTML).toContain('Safe content');
  });

  it('should display cover image when available', async () => {
    const mockPost = {
      id: 'post-123',
      title: 'Test Blog Post',
      slug: 'test-blog-post',
      excerpt: 'Test excerpt',
      content: '<p>Test content</p>',
      coverImage: 'https://example.com/cover.jpg',
      metaTitle: null,
      metaDescription: null,
      tags: [],
      author: 'Test Author',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      status: 'published' as const,
    };

    mockFindFirst.mockResolvedValue(mockPost);

    const params = Promise.resolve({ slug: 'test-blog-post' });
    const component = await BlogPostPage({ params });

    const { container } = render(component);

    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img?.getAttribute('src')).toBe('https://example.com/cover.jpg');
  });

  it('should not display cover image when not available', async () => {
    const mockPost = {
      id: 'post-123',
      title: 'Test Blog Post',
      slug: 'test-blog-post',
      excerpt: 'Test excerpt',
      content: '<p>Test content</p>',
      coverImage: null,
      metaTitle: null,
      metaDescription: null,
      tags: [],
      author: 'Test Author',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      status: 'published' as const,
    };

    mockFindFirst.mockResolvedValue(mockPost);

    const params = Promise.resolve({ slug: 'test-blog-post' });
    const component = await BlogPostPage({ params });

    const { container } = render(component);

    // Should not have cover image div
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('should display tags when available', async () => {
    const mockPost = {
      id: 'post-123',
      title: 'Test Blog Post',
      slug: 'test-blog-post',
      excerpt: 'Test excerpt',
      content: '<p>Test content</p>',
      coverImage: null,
      metaTitle: null,
      metaDescription: null,
      tags: ['tag1', 'tag2', 'tag3'],
      author: 'Test Author',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      status: 'published' as const,
    };

    mockFindFirst.mockResolvedValue(mockPost);

    const params = Promise.resolve({ slug: 'test-blog-post' });
    const component = await BlogPostPage({ params });

    const { container } = render(component);

    expect(container).toHaveTextContent('tag1');
    expect(container).toHaveTextContent('tag2');
    expect(container).toHaveTextContent('tag3');
  });

  it('should handle database errors gracefully', async () => {
    mockFindFirst.mockRejectedValue(new Error('Database error'));

    const params = Promise.resolve({ slug: 'test-blog-post' });

    // When getBlogPost returns null (due to error), component calls notFound() which throws
    await expect(BlogPostPage({ params })).rejects.toThrow('NOT_FOUND');
  });
});

