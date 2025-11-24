import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { secureAdminRoute, handleError, mapPrismaError, sanitizeContent } from '@/lib/api-security';
import { projectUpdateSchema, projectPatchSchema } from '@/lib/validation-schemas';
import { z } from 'zod';
import type { ProjectUpdateData } from '@/types/database';

export const dynamic = 'force-dynamic';

async function getHandler(request: NextRequest, user: { id: string; email: string; role: string }, id: string) {
  try {
    const project = await db.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: project.id,
      title: project.title,
      slug: project.slug,
      excerpt: project.excerpt || '',
      content: project.content,
      cover_image: project.coverImage || '',
      meta_title: project.metaTitle || '',
      meta_description: project.metaDescription || '',
      technologies: project.technologies,
      github_url: project.githubUrl || '',
      live_url: project.liveUrl || '',
      author: project.author,
      status: project.status,
      published_at: project.publishedAt?.toISOString() || null,
      created_at: project.createdAt.toISOString(),
      updated_at: project.updatedAt.toISOString(),
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      const { message, status } = mapPrismaError(error);
      return NextResponse.json({ error: message }, { status });
    }
    return handleError(error, 'Failed to fetch project');
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
    const validated = projectUpdateSchema.parse(body);

    // Check if project exists
    const existing = await db.project.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if slug is being changed and if new slug exists
    if (validated.slug && validated.slug !== existing.slug) {
      const slugExists = await db.project.findUnique({
        where: { slug: validated.slug },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'A project with this slug already exists' },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData: ProjectUpdateData = {
      updatedAt: new Date(),
    };

    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.slug !== undefined) updateData.slug = validated.slug;
    if (validated.excerpt !== undefined) updateData.excerpt = validated.excerpt || null;
    if (validated.content !== undefined) updateData.content = sanitizeContent(validated.content);
    if (validated.cover_image !== undefined) updateData.coverImage = validated.cover_image || null;
    if (validated.meta_title !== undefined) updateData.metaTitle = validated.meta_title || null;
    if (validated.meta_description !== undefined) updateData.metaDescription = validated.meta_description || null;
    if (validated.technologies !== undefined) updateData.technologies = validated.technologies;
    if (validated.github_url !== undefined) updateData.githubUrl = validated.github_url || null;
    if (validated.live_url !== undefined) updateData.liveUrl = validated.live_url || null;
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

    const project = await db.project.update({
      where: { id },
      data: updateData,
    });

    // Log audit event
    console.log('AUDIT:', {
      userId: user.id,
      userEmail: user.email,
      action: 'project_updated',
      resourceType: 'Project',
      resourceId: project.id,
      details: { title: project.title, slug: project.slug },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      userAgent: request.headers.get('user-agent') || null,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      id: project.id,
      title: project.title,
      slug: project.slug,
      excerpt: project.excerpt || '',
      content: project.content,
      cover_image: project.coverImage || '',
      meta_title: project.metaTitle || '',
      meta_description: project.metaDescription || '',
      technologies: project.technologies,
      github_url: project.githubUrl || '',
      live_url: project.liveUrl || '',
      author: project.author,
      status: project.status,
      published_at: project.publishedAt?.toISOString() || null,
      created_at: project.createdAt.toISOString(),
      updated_at: project.updatedAt.toISOString(),
    });
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
    return handleError(error, 'Failed to update project');
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
    // Get project info before deletion for audit log
    const project = await db.project.findUnique({
      where: { id },
      select: { id: true, title: true, slug: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    await db.project.delete({
      where: { id },
    });

    // Log audit event
    console.log('AUDIT:', {
      userId: user.id,
      userEmail: user.email,
      action: 'project_deleted',
      resourceType: 'Project',
      resourceId: project.id,
      details: { title: project.title, slug: project.slug },
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
    return handleError(error, 'Failed to delete project');
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
    const validated = projectPatchSchema.parse(body);

    const existing = await db.project.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Project not found' },
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

    const project = await db.project.update({
      where: { id },
      data: updateData,
    });

    // Log audit event
    console.log('AUDIT:', {
      userId: user.id,
      userEmail: user.email,
      action: 'project_patched',
      resourceType: 'Project',
      resourceId: project.id,
      details: { status: project.status, publishedAt: project.publishedAt },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      userAgent: request.headers.get('user-agent') || null,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      id: project.id,
      status: project.status,
      published_at: project.publishedAt?.toISOString() || null,
    });
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
    return handleError(error, 'Failed to update project');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return secureAdminRoute((req, user) => patchHandler(req, user, id))(request);
}
