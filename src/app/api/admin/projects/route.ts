import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { secureAdminRoute, handleError } from "@/lib/api-security";

export const dynamic = "force-dynamic";

/** Every project, drafts included (the public /api/projects lists published ones only). */
export const GET = secureAdminRoute(async () => {
  try {
    const projects = await db.project.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(
      projects.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt || "",
        technologies: p.technologies,
        github_url: p.githubUrl || "",
        live_url: p.liveUrl || "",
        status: p.status,
        published_at: p.publishedAt?.toISOString() || null,
        created_at: p.createdAt.toISOString(),
        updated_at: p.updatedAt.toISOString(),
      })),
    );
  } catch (error) {
    return handleError(error, "Failed to load projects");
  }
});
