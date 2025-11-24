import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GET } from '@/app/api/blog/[slug]/route';
import { db } from '@/lib/db';

// Mock dependencies
jest.mock('@/lib/db');

const mockFindUnique = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (db.blogPost.findUnique as jest.Mock) = mockFindUnique;
});

describe('GET /api/blog/[slug]', () => {
  it('should return 404 if blog post not found', async () => {
    mockFindUnique.mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/blog/non-existent');
    const response = await GET(request, { params: { slug: 'non-existent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Post not found');
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: {
        slug: 'non-existent',
        status: 'published',
      },
      select: expect.any(Object),
    });
  });

  it('should return blog post data for published post', async () => {
    const mockPost = {
      id: 'post-123',
      title: 'Test Blog Post',
      slug: 'test-blog-post',
      excerpt: 'Test excerpt',
      content: 'Test content',
      coverImage: 'https://example.com/image.jpg',
      metaTitle: 'Test Meta Title',
      metaDescription: 'Test meta description',
      tags: ['test', 'blog'],
      author: 'Test Author',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      status: 'published',
    };

    mockFindUnique.mockResolvedValue(mockPost);

    const request = new Request('http://localhost:3000/api/blog/test-blog-post');
    const response = await GET(request, { params: { slug: 'test-blog-post' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('post-123');
    expect(data.title).toBe('Test Blog Post');
    expect(data.slug).toBe('test-blog-post');
    expect(data.excerpt).toBe('Test excerpt');
    expect(data.content).toBe('Test content');
    expect(data.cover_image).toBe('https://example.com/image.jpg');
    expect(data.meta_title).toBe('Test Meta Title');
    expect(data.meta_description).toBe('Test meta description');
    expect(data.tags).toEqual(['test', 'blog']);
    expect(data.author).toBe('Test Author');
    expect(data.status).toBe('published');
    expect(data.created_at).toBe(mockPost.createdAt.toISOString());
    expect(data.updated_at).toBe(mockPost.updatedAt.toISOString());
  });

  it('should handle null optional fields', async () => {
    const mockPost = {
      id: 'post-123',
      title: 'Test Blog Post',
      slug: 'test-blog-post',
      excerpt: null,
      content: 'Test content',
      coverImage: null,
      metaTitle: null,
      metaDescription: null,
      tags: [],
      author: 'Test Author',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      status: 'published',
    };

    mockFindUnique.mockResolvedValue(mockPost);

    const request = new Request('http://localhost:3000/api/blog/test-blog-post');
    const response = await GET(request, { params: { slug: 'test-blog-post' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.excerpt).toBe('');
    expect(data.cover_image).toBe('');
    expect(data.meta_title).toBe('');
    expect(data.meta_description).toBe('');
  });

  it('should only return published posts', async () => {
    mockFindUnique.mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/blog/draft-post');
    await GET(request, { params: { slug: 'draft-post' } });

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: {
        slug: 'draft-post',
        status: 'published',
      },
      select: expect.any(Object),
    });
  });

  it('should include cache headers in response', async () => {
    const mockPost = {
      id: 'post-123',
      title: 'Test Blog Post',
      slug: 'test-blog-post',
      excerpt: 'Test excerpt',
      content: 'Test content',
      coverImage: null,
      metaTitle: null,
      metaDescription: null,
      tags: [],
      author: 'Test Author',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      status: 'published',
    };

    mockFindUnique.mockResolvedValue(mockPost);

    const request = new Request('http://localhost:3000/api/blog/test-blog-post');
    const response = await GET(request, { params: { slug: 'test-blog-post' } });

    expect(response.headers.get('Cache-Control')).toBe('public, s-maxage=3600, stale-while-revalidate=86400');
  });

  it('should return 500 on database error', async () => {
    mockFindUnique.mockRejectedValue(new Error('Database error'));

    const request = new Request('http://localhost:3000/api/blog/test-blog-post');
    const response = await GET(request, { params: { slug: 'test-blog-post' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch blog post');
  });
});

