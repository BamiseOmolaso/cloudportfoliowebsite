import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { sanitizeHtmlServer } from '@/lib/sanitize-server';
import type { Metadata } from 'next';

interface Project {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  meta_title: string;
  meta_description: string;
  technologies: string[];
  github_url?: string;
  live_url?: string;
  author: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  status: 'draft' | 'published' | 'scheduled';
}

async function getProject(slug: string): Promise<Project | null> {
  try {
    const project = await db.project.findFirst({
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
        technologies: true,
        githubUrl: true,
        liveUrl: true,
        author: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        publishedAt: true,
      },
    });

    if (!project) {
      return null;
    }

    // Transform to match frontend format
    return {
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
    };
  } catch (error) {
    console.error('Error fetching project:', error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) {
    return {
      title: 'Project Not Found',
    };
  }

  return {
    title: project.meta_title || project.title,
    description: project.meta_description || project.excerpt,
    openGraph: {
      title: project.meta_title || project.title,
      description: project.meta_description || project.excerpt,
      images: project.cover_image ? [project.cover_image] : [],
      type: 'article',
      publishedTime: project.created_at,
      modifiedTime: project.updated_at,
      authors: [project.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: project.meta_title || project.title,
      description: project.meta_description || project.excerpt,
      images: project.cover_image ? [project.cover_image] : [],
    },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) {
    notFound();
  }

  // Handle content - check if it's a JSON string or HTML/Markdown
  let content = project.content;
  
  // If content looks like a JSON object string, try to parse it
  if (typeof content === 'string' && content.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(content);
      // If it's the entire project object, extract the content field
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
          {project.cover_image && (
            <div className="relative h-64 md:h-96 w-full">
              <Image
                src={project.cover_image}
                alt={project.title}
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
                href="/projects"
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
                Back to Projects
              </Link>
              
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                {project.title}
              </h1>
              
              <div className="flex flex-wrap items-center text-gray-400 text-sm mb-4 gap-2">
                <span className="font-medium">{project.author}</span>
                <span>•</span>
                <time dateTime={project.created_at}>
                  {format(new Date(project.created_at), 'MMMM d, yyyy')}
                </time>
                {project.updated_at !== project.created_at && (
                  <>
                    <span>•</span>
                    <span className="text-gray-500">
                      Updated {format(new Date(project.updated_at), 'MMMM d, yyyy')}
                    </span>
                  </>
                )}
              </div>
              
              {project.technologies.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {project.technologies.map(tech => (
                    <span
                      key={tech}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}

              {(project.github_url || project.live_url) && (
                <div className="flex flex-wrap gap-4 mb-6">
                  {project.github_url && (
                    <a
                      href={project.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-1.004-.013-1.845-2.757.6-3.338-1.169-3.338-1.169-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                          clipRule="evenodd"
                        />
                      </svg>
                      View on GitHub
                    </a>
                  )}
                  {project.live_url && (
                    <a
                      href={project.live_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                      View Live Demo
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Project Content */}
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
