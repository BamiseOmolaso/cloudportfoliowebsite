import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  secureAdminRoute,
  handleError,
  mapPrismaError,
  sanitizeContent,
} from "@/lib/api-security";
import { projectCreateSchema } from "@/lib/validation-schemas";

export const dynamic = "force-dynamic";

const publicStatusSchema = z.enum(["published"]).default("published");

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = publicStatusSchema.parse(
      searchParams.get("status") || "published",
    );

    const projects = await db.project.findMany({
      where: { status },
      orderBy: { publishedAt: "desc" },
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

    const transformedProjects = projects.map(
      (project: (typeof projects)[0]) => ({
        id: project.id,
        title: project.title,
        slug: project.slug,
        excerpt: project.excerpt || "",
        content: project.content,
        cover_image: project.coverImage || "",
        meta_title: project.metaTitle || "",
        meta_description: project.metaDescription || "",
        technologies: project.technologies,
        github_url: project.githubUrl || "",
        live_url: project.liveUrl || "",
        author: project.author,
        created_at: project.createdAt.toISOString(),
        updated_at: project.updatedAt.toISOString(),
        status: project.status,
        published_at: project.publishedAt?.toISOString() || null,
      }),
    );

    return NextResponse.json(transformedProjects);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    console.error("Error fetching projects:", error);
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "PrismaClientInitializationError"
    ) {
      return NextResponse.json([], { status: 200 });
    }
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 },
    );
  }
}

export const POST = secureAdminRoute(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const validated = projectCreateSchema.parse(body);

    const sanitizedContent = sanitizeContent(validated.content);
    const sanitizedExcerpt = validated.excerpt
      ? sanitizeContent(validated.excerpt)
      : null;

    const project = await db.project.create({
      data: {
        title: validated.title,
        slug: validated.slug,
        excerpt: sanitizedExcerpt,
        content: sanitizedContent,
        coverImage: validated.cover_image || null,
        metaTitle: validated.meta_title || null,
        metaDescription: validated.meta_description || null,
        technologies: validated.technologies,
        githubUrl: validated.github_url || null,
        liveUrl: validated.live_url || null,
        author: validated.author,
        status: validated.status,
        publishedAt: validated.status === "published" ? new Date() : null,
      },
    });

    console.log("AUDIT:", {
      userId: user.id,
      userEmail: user.email,
      action: "project_created",
      resourceType: "Project",
      resourceId: project.id,
      details: { title: project.title, slug: project.slug },
      ipAddress:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        null,
      userAgent: request.headers.get("user-agent") || null,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
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
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 },
      );
    }
    if (error && typeof error === "object" && "code" in error) {
      const { message, status } = mapPrismaError(error);
      return NextResponse.json({ error: message }, { status });
    }
    return handleError(error, "Failed to create project");
  }
});
