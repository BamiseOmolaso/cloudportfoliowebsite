"use client";

import ContentList, { type ContentItem } from "@/components/admin/ContentList";

const toItem = (r: Record<string, unknown>): ContentItem => ({
  id: String(r.id),
  title: String(r.title),
  slug: String(r.slug),
  status: String(r.status),
  updated_at: String(r.updated_at),
  labels: Array.isArray(r.technologies) ? (r.technologies as string[]) : [],
});

export default function AdminProjectsPage() {
  return (
    <ContentList
      noun="project"
      title="Projects"
      subtitle="Every project, published and draft. Click a title to edit it."
      listUrl="/api/admin/projects"
      itemUrl={(id) => `/api/admin/projects/${id}`}
      toItem={toItem}
      newHref="/admin/projects/new"
      editHref={(i) => `/admin/projects/edit/${i.id}`}
      liveHref={(i) => `/projects/${i.slug}`}
    />
  );
}
