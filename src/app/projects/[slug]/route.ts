import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const project = await db.project.findUnique({
      where: {
        slug: params.slug,
        status: 'published',
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Transform to match frontend format
    const transformedProject = {
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
      created_at: project.createdAt.toISOString(),
      updated_at: project.updatedAt.toISOString(),
      status: project.status,
      published_at: project.publishedAt?.toISOString() || null,
    }

    return NextResponse.json(transformedProject)
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}