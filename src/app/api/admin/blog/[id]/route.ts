import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { secureAdminRoute, handleError, mapPrismaError, sanitizeContent } from '@/lib/api-security';
import { blogPostUpdateSchema, blogPostPatchSchema } from '@/lib/validation-schemas';
import { z } from 'zod';
import type { BlogPostUpdateData } from '@/types/database';

export const dynamic = 'force-dynamic';

async function getHandler(request: NextRequest, user: { id: string; email: string; role: string }, id: string) {
  try {
    const post = await db.blogPost.findUnique({
      where: { id },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Transform to match frontend format
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

    return NextResponse.json(transformed);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      const { message, status } = mapPrismaError(error);
      return NextResponse.json({ error: message }, { status });
    }
    return handleError(error, 'Failed to fetch blog post');
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return secureAdminRoute((req, user) => getHandler(req, user, id))(request);
}

async function putHandler(request: NextRequest, user: { id: string; email: string; role: string }, id: string) {
  try {
    const body = await request.json();

    // Validate input
    const validated = blogPostUpdateSchema.parse(body);

    // Check if post exists
    const existing = await db.blogPost.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if slug is being changed and if new slug exists
    if (validated.slug && validated.slug !== existing.slug) {
      const slugExists = await db.blogPost.findUnique({
        where: { slug: validated.slug },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'A post with this slug already exists' },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData: BlogPostUpdateData = {
      updatedAt: new Date(),
    };

    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.slug !== undefined) updateData.slug = validated.slug;
    if (validated.content !== undefined) updateData.content = sanitizeContent(validated.content);
    if (validated.excerpt !== undefined) updateData.excerpt = validated.excerpt ? sanitizeContent(validated.excerpt) : null;
    if (validated.cover_image !== undefined) updateData.coverImage = validated.cover_image || null;
    if (validated.meta_title !== undefined) updateData.metaTitle = validated.meta_title || null;
    if (validated.meta_description !== undefined) updateData.metaDescription = validated.meta_description || null;
    if (validated.tags !== undefined) updateData.tags = validated.tags;
    if (validated.author !== undefined) updateData.author = validated.author;
    if (validated.status !== undefined) {
      updateData.status = validated.status;
      // Update publishedAt based on status
      if (validated.status === 'published' && existing.status !== 'published') {
        updateData.publishedAt = new Date();
      } else if (validated.status !== 'published' && existing.status === 'published') {
        updateData.publishedAt = null;
      }
    }

    const post = await db.blogPost.update({
      where: { id },
      data: updateData,
    });

    // Log audit event
    console.log('AUDIT:', {
      userId: user.id,
      userEmail: user.email,
      action: 'blog_post_updated',
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

    return NextResponse.json(transformed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    if (error && typeof error === 'object' && 'code' in error) {
      const { message, status } = mapPrismaError(error);
      return NextResponse.json({ error: message }, { status });
    }
    return handleError(error, 'Failed to update blog post');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return secureAdminRoute((req, user) => putHandler(req, user, id))(request);
}

async function deleteHandler(request: NextRequest, user: { id: string; email: string; role: string }, id: string) {
  try {
    // Get post info before deletion for audit log
    const post = await db.blogPost.findUnique({
      where: { id },
      select: { id: true, title: true, slug: true },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    await db.blogPost.delete({
      where: { id },
    });

    // Log audit event
    console.log('AUDIT:', {
      userId: user.id,
      userEmail: user.email,
      action: 'blog_post_deleted',
      resourceType: 'BlogPost',
      resourceId: post.id,
      details: { title: post.title, slug: post.slug },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      userAgent: request.headers.get('user-agent') || null,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      const { message, status } = mapPrismaError(error);
      return NextResponse.json({ error: message }, { status });
    }
    return handleError(error, 'Failed to delete blog post');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return secureAdminRoute((req, user) => deleteHandler(req, user, id))(request);
}

async function patchHandler(request: NextRequest, user: { id: string; email: string; role: string }, id: string) {
  try {
    const body = await request.json();

    // Validate input
    const validated = blogPostPatchSchema.parse(body);

    const existing = await db.blogPost.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    const updateData: Partial<{ status: 'draft' | 'published' | 'scheduled'; publishedAt: Date | null }> = {};
    if (validated.status !== undefined) {
      updateData.status = validated.status;
      if (validated.status === 'published' && existing.status !== 'published') {
        updateData.publishedAt = new Date();
      } else if (validated.status !== 'published' && existing.status === 'published') {
        updateData.publishedAt = null;
      }
    }
    if (validated.publishedAt !== undefined) {
      updateData.publishedAt = validated.publishedAt ? new Date(validated.publishedAt) : null;
    }

    const post = await db.blogPost.update({
      where: { id },
      data: updateData,
    });

    // Log audit event
    console.log('AUDIT:', {
      userId: user.id,
      userEmail: user.email,
      action: 'blog_post_patched',
      resourceType: 'BlogPost',
      resourceId: post.id,
      details: { status: post.status, publishedAt: post.publishedAt },
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

    return NextResponse.json(transformed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    if (error && typeof error === 'object' && 'code' in error) {
      const { message, status } = mapPrismaError(error);
      return NextResponse.json({ error: message }, { status });
    }
    return handleError(error, 'Failed to update blog post');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return secureAdminRoute((req, user) => patchHandler(req, user, id))(request);
}
