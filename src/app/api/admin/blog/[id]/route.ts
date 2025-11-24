import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const post = await db.blogPost.findUnique({
      where: { id: params.id },
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
    console.error('Error fetching blog post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog post' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    // Check if post exists
    const existing = await db.blogPost.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if slug is being changed and if new slug exists
    if (slug && slug !== existing.slug) {
      const slugExists = await db.blogPost.findUnique({
        where: { slug },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'A post with this slug already exists' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {
      title: title ?? existing.title,
      slug: slug ?? existing.slug,
      content: content ?? existing.content,
      excerpt: excerpt !== undefined ? excerpt : existing.excerpt,
      coverImage: cover_image !== undefined ? cover_image : existing.coverImage,
      metaTitle: meta_title !== undefined ? meta_title : existing.metaTitle,
      metaDescription: meta_description !== undefined ? meta_description : existing.metaDescription,
      tags: tags ?? existing.tags,
      author: author ?? existing.author,
      status: status ?? existing.status,
      updatedAt: new Date(),
    };

    // Update publishedAt if status changed to published
    if (status === 'published' && existing.status !== 'published') {
      updateData.publishedAt = new Date();
    } else if (status !== 'published' && existing.status === 'published') {
      updateData.publishedAt = null;
    }

    const post = await db.blogPost.update({
      where: { id: params.id },
      data: updateData,
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
    console.error('Error updating blog post:', error);
    return NextResponse.json(
      { error: 'Failed to update blog post' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await db.blogPost.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    return NextResponse.json(
      { error: 'Failed to delete blog post' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, publishedAt } = body;

    const existing = await db.blogPost.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (publishedAt !== undefined) {
      updateData.publishedAt = publishedAt ? new Date(publishedAt) : null;
    } else if (status === 'published' && existing.status !== 'published') {
      updateData.publishedAt = new Date();
    } else if (status !== 'published' && existing.status === 'published') {
      updateData.publishedAt = null;
    }

    const post = await db.blogPost.update({
      where: { id: params.id },
      data: updateData,
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
    console.error('Error updating blog post:', error);
    return NextResponse.json(
      { error: 'Failed to update blog post' },
      { status: 500 }
    );
  }
}
