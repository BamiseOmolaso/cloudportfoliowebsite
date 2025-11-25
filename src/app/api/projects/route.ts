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
    const transformedProjects = projects.map((project: typeof projects[0]) => ({
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
    
    // Handle database connection errors gracefully
    if (error && typeof error === 'object' && 'name' in error && error.name === 'PrismaClientInitializationError') {
      // Return empty array if database is not available (e.g., in development)
      return NextResponse.json([], { status: 200 })
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
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
    } = body

    if (!title || !slug || !content) {
      return NextResponse.json(
        { error: 'Title, slug, and content are required' },
        { status: 400 }
      )
    }

    const project = await db.project.create({
      data: {
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
        publishedAt: status === 'published' ? new Date() : null,
      },
    })

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
    })
  } catch (error: unknown) {
    console.error('Error creating project:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A project with this slug already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}