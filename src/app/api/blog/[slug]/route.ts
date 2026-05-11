import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> | { slug: string } },
) {
  try {
    const { slug } = await params;

    const post = await db.blogPost.findFirst({
      where: {
        slug,
        status: "published",
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
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const transformedPost = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      content: post.content,
      cover_image: post.coverImage || "",
      meta_title: post.metaTitle || "",
      meta_description: post.metaDescription || "",
      tags: post.tags,
      author: post.author,
      created_at: post.createdAt.toISOString(),
      updated_at: post.updatedAt.toISOString(),
      status: post.status,
    };

    const response = NextResponse.json(transformedPost);
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
    return response;
  } catch (error) {
    console.error("Error fetching blog post:", error);

    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "PrismaClientInitializationError"
    ) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to fetch blog post" },
      { status: 500 },
    );
  }
}
