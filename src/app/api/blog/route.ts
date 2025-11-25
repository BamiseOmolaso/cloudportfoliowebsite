import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'published'

    const posts = await db.blogPost.findMany({
      where: { status },
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
        createdAt: true,
        updatedAt: true,
        status: true,
      },
    })

    // Transform snake_case to camelCase for frontend
    const transformedPosts = posts.map((post: typeof posts[0]) => ({
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
      created_at: post.createdAt.toISOString(),
      updated_at: post.updatedAt.toISOString(),
      status: post.status,
    }))

    const response = NextResponse.json(transformedPosts);
    
    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    
    return response;
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    
    // Handle database connection errors gracefully
    if (error && typeof error === 'object' && 'name' in error && error.name === 'PrismaClientInitializationError') {
      // Return empty array if database is not available (e.g., in development)
      return NextResponse.json([], { status: 200 })
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch blog posts' },
      { status: 500 }
    )
  }
}