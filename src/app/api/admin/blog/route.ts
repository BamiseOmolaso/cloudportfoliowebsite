import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const posts = await db.blogPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        coverImage: true,
        metaTitle: true,
        metaDescription: true,
        tags: true,
        author: true,
        status: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Transform to match frontend format
    const transformed = posts.map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || '',
      content: post.content,
      cover_image: post.coverImage || '',
      meta_title: post.metaTitle || '',
      meta_description: post.metaDescription || '',
      tags: post.tags,
      author: post.author,
      status: post.status,
      published_at: post.publishedAt?.toISOString() || null,
      created_at: post.createdAt.toISOString(),
      updated_at: post.updatedAt.toISOString(),
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      slug,
      content,
      excerpt,
      cover_image,
      meta_title,
      meta_description,
      tags,
      author,
      status,
    } = body;

    // Validate required fields
    if (!title || !slug || !content) {
      return NextResponse.json(
        { error: 'Title, slug, and content are required' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existing = await db.blogPost.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A post with this slug already exists' },
        { status: 400 }
      );
    }

    const post = await db.blogPost.create({
      data: {
        title,
        slug,
        content,
        excerpt: excerpt || null,
        coverImage: cover_image || null,
        metaTitle: meta_title || null,
        metaDescription: meta_description || null,
        tags: tags || [],
        author: author || 'Bamise',
        status: status || 'draft',
        publishedAt: status === 'published' ? new Date() : null,
      },
    });

    // Transform response
    const transformed = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || '',
      content: post.content,
      cover_image: post.coverImage || '',
      meta_title: post.metaTitle || '',
      meta_description: post.metaDescription || '',
      tags: post.tags,
      author: post.author,
      status: post.status,
      published_at: post.publishedAt?.toISOString() || null,
      created_at: post.createdAt.toISOString(),
      updated_at: post.updatedAt.toISOString(),
    };

    return NextResponse.json(transformed, { status: 201 });
  } catch (error) {
    console.error('Error creating blog post:', error);
    return NextResponse.json(
      { error: 'Failed to create blog post' },
      { status: 500 }
    );
  }
}
