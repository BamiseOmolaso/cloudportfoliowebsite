import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { secureAdminRoute, handleError, mapPrismaError, sanitizeContent } from '@/lib/api-security';
import { blogPostCreateSchema } from '@/lib/validation-schemas';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export const GET = secureAdminRoute(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Validate status parameter
    const statusSchema = z.enum(['draft', 'published', 'scheduled', 'all']).optional();
    const validatedStatus = statusSchema.parse(status || 'all');

    const where: any = {};
    if (validatedStatus && validatedStatus !== 'all') {
      where.status = validatedStatus;
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid status parameter', details: error.errors },
        { status: 400 }
      );
    }
    return handleError(error, 'Failed to fetch blog posts');
  }
});

export const POST = secureAdminRoute(async (request: NextRequest, user) => {
  try {
    const body = await request.json();

    // Validate input with Zod
    const validated = blogPostCreateSchema.parse(body);

    // Check if slug already exists
    const existing = await db.blogPost.findUnique({
      where: { slug: validated.slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A post with this slug already exists' },
        { status: 409 }
      );
    }

    // Sanitize HTML content
    const sanitizedContent = sanitizeContent(validated.content);
    const sanitizedExcerpt = validated.excerpt ? sanitizeContent(validated.excerpt) : null;

    const post = await db.blogPost.create({
      data: {
        title: validated.title,
        slug: validated.slug,
        content: sanitizedContent,
        excerpt: sanitizedExcerpt,
        coverImage: validated.cover_image || null,
        metaTitle: validated.meta_title || null,
        metaDescription: validated.meta_description || null,
        tags: validated.tags,
        author: validated.author,
        status: validated.status,
        publishedAt: validated.status === 'published' ? new Date() : null,
      },
    });

    // Log audit event (server-side logging for now)
    console.log('AUDIT:', {
      userId: user.id,
      userEmail: user.email,
      action: 'blog_post_created',
      resourceType: 'BlogPost',
      resourceId: post.id,
      details: { title: post.title, slug: post.slug },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      userAgent: request.headers.get('user-agent') || null,
      timestamp: new Date().toISOString(),
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const { message, status } = mapPrismaError(error);
      return NextResponse.json({ error: message }, { status });
    }

    return handleError(error, 'Failed to create blog post');
  }
});
