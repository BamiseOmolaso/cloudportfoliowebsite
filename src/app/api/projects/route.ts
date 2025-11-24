import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'published'

    const projects = await db.project.findMany({
      where: { status },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        coverImage: true,
        metaTitle: true,
        metaDescription: true,
        technologies: true,
        githubUrl: true,
        liveUrl: true,
        author: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        publishedAt: true,
      },
    })

    // Transform to match frontend format
    const transformedProjects = projects.map(project => ({
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
    }))

    return NextResponse.json(transformedProjects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}