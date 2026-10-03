"use client";

import ContentList, { type ContentItem } from "@/components/admin/ContentList";

const toItem = (r: Record<string, unknown>): ContentItem => ({
  id: String(r.id),
  title: String(r.title),
  slug: String(r.slug),
  status: String(r.status),
  updated_at: String(r.updated_at),
  labels: Array.isArray(r.tags) ? (r.tags as string[]) : [],
});

export default function AdminBlogPage() {
  return (
    <ContentList
      noun="post"
      title="Blog"
      subtitle="Every post, published and draft. Click a title to edit it."
      listUrl="/api/admin/blog"
      itemUrl={(id) => `/api/admin/blog/${id}`}
      toItem={toItem}
      newHref="/admin/blog/new"
      editHref={(i) => `/admin/blog/edit/${i.id}`}
      liveHref={(i) => `/blog/${i.slug}`}
    />
  );
}
