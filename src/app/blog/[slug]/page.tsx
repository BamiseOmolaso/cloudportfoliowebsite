import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { sanitizeHtmlServer } from '@/lib/sanitize-server';
import type { Metadata } from 'next';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  meta_title: string;
  meta_description: string;
  tags: string[];
  author: string;
  created_at: string;
  updated_at: string;
  status: 'draft' | 'published' | 'scheduled';
}

async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const post = await db.blogPost.findFirst({
      where: {
        slug,
        status: 'published',
      },
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
    });

    if (!post) {
      return null;
    }

    // Transform to match frontend format
    return {
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
      status: post.status as 'draft' | 'published' | 'scheduled',
    };
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  return {
    title: post.meta_title || post.title,
    description: post.meta_description || post.excerpt,
    openGraph: {
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt,
      images: post.cover_image ? [post.cover_image] : [],
      type: 'article',
      publishedTime: post.created_at,
      modifiedTime: post.updated_at,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt,
      images: post.cover_image ? [post.cover_image] : [],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    notFound();
  }

  // Handle content - check if it's a JSON string or HTML/Markdown
  let content = post.content;
  
  // If content looks like a JSON object string, try to parse it
  if (typeof content === 'string' && content.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(content);
      // If it's the entire post object, extract the content field
      if (parsed.content) {
        content = parsed.content;
      } else if (parsed.html) {
        content = parsed.html;
      }
    } catch (e) {
      // Not valid JSON, use as-is
    }
  }

  // Sanitize content (server-safe sanitization)
  const sanitizedContent = sanitizeHtmlServer(content);

  return (
    <div className="min-h-screen py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="bg-gray-900 rounded-lg overflow-hidden shadow-xl">
          {post.cover_image && (
            <div className="relative h-64 md:h-96 w-full">
              <Image
                src={post.cover_image}
                alt={post.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 896px"
                className="object-cover"
                priority
              />
            </div>
          )}

          <div className="p-6 md:p-8">
            <div className="mb-8">
              <Link
                href="/blog"
                className="inline-flex items-center text-purple-400 hover:text-purple-300 mb-6 transition-colors group"
              >
                <svg
                  className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to Blog
              </Link>
              
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                {post.title}
              </h1>
              
              <div className="flex flex-wrap items-center text-gray-400 text-sm mb-4 gap-2">
                <span className="font-medium">{post.author}</span>
                <span>•</span>
                <time dateTime={post.created_at}>
                  {format(new Date(post.created_at), 'MMMM d, yyyy')}
                </time>
                {post.updated_at !== post.created_at && (
                  <>
                    <span>•</span>
                    <span className="text-gray-500">
                      Updated {format(new Date(post.updated_at), 'MMMM d, yyyy')}
                    </span>
                  </>
                )}
              </div>
              
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {post.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Blog Content */}
            <div 
              className="prose prose-invert prose-lg max-w-none 
                prose-headings:text-white prose-headings:font-bold
                prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
                prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4
                prose-a:text-purple-400 prose-a:no-underline hover:prose-a:text-purple-300 hover:prose-a:underline
                prose-strong:text-white prose-strong:font-semibold
                prose-code:text-purple-400 prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700 prose-pre:rounded-lg prose-pre:p-4
                prose-blockquote:border-l-4 prose-blockquote:border-purple-500 prose-blockquote:pl-4 prose-blockquote:text-gray-300 prose-blockquote:italic
                prose-img:rounded-lg prose-img:shadow-lg prose-img:my-8
                prose-ul:text-gray-300 prose-ol:text-gray-300 prose-ul:my-4 prose-ol:my-4
                prose-li:marker:text-purple-400 prose-li:my-2
                prose-hr:border-gray-700 prose-hr:my-8"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }} 
            />
          </div>
        </article>
      </div>
    </div>
  );
}
