import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const project = await db.project.findUnique({
      where: { id: params.id },
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
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
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
      excerpt,
      content,
      cover_image,
      meta_title,
      meta_description,
      technologies,
      github_url,
      live_url,
      author,
      status,
    } = body;

    const updateData: any = {
      title,
      slug,
      excerpt: excerpt || null,
      content,
      coverImage: cover_image || null,
      metaTitle: meta_title || null,
      metaDescription: meta_description || null,
      technologies: technologies || [],
      githubUrl: github_url || null,
      liveUrl: live_url || null,
      author: author || 'Bamise Omolaso',
      status: status || 'draft',
    };

    if (status === 'published') {
      updateData.publishedAt = new Date();
    } else if (status === 'draft') {
      updateData.publishedAt = null;
    }

    const project = await db.project.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      id: project.id,
      title: project.title,
      slug: project.slug,
      excerpt: project.excerpt,
      content: project.content,
      cover_image: project.coverImage,
      meta_title: project.metaTitle,
      meta_description: project.metaDescription,
      technologies: project.technologies,
      github_url: project.githubUrl,
      live_url: project.liveUrl,
      author: project.author,
      status: project.status,
      published_at: project.publishedAt?.toISOString() || null,
      created_at: project.createdAt.toISOString(),
      updated_at: project.updatedAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Error updating project:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A project with this slug already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await db.project.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete project' },
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

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (publishedAt !== undefined) {
      updateData.publishedAt = publishedAt ? new Date(publishedAt) : null;
    }

    const project = await db.project.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      id: project.id,
      status: project.status,
      published_at: project.publishedAt?.toISOString() || null,
    });
  } catch (error: any) {
    console.error('Error updating project:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}
