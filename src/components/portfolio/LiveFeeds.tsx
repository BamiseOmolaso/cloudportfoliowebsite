"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { livePosts, liveProjects } from "@/content/portfolio";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  created_at: string;
}

interface DbProject {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  technologies: string[];
  github_url?: string;
}

/** Fetch a published feed from the site's own API; empty on any failure. */
function useFeed<T>(url: string, max: number): T[] {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setItems(data.slice(0, max));
      })
      .catch(() => {
        // No database, or the API is down: the section just doesn't appear.
      });
    return () => {
      cancelled = true;
    };
  }, [url, max]);
  return items;
}

/** The latest published posts. Renders nothing until there is at least one. */
export function LivePosts() {
  const posts = useFeed<Post>("/api/blog?status=published", 2);
  if (posts.length === 0) return null;

  return (
    <section className="block" id="posts">
      <div className="sec-head rise">
        <span className="label">{livePosts.label}</span>
        <h2>{livePosts.title}</h2>
      </div>
      <div className="posts">
        {posts.map((p) => (
          <Link className="post rise" key={p.id} href={`/blog/${p.slug}`}>
            <span className="label">
              {new Date(p.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <h3>{p.title}</h3>
            <p>{p.excerpt}</p>
            <span className="go">Read →</span>
          </Link>
        ))}
      </div>
      <p className="more">
        <Link href="/blog">{livePosts.all}</Link>
      </p>
    </section>
  );
}

/** Projects added through the admin panel, shown under the curated work. */
export function LiveProjects() {
  const projects = useFeed<DbProject>("/api/projects?status=published", 3);
  if (projects.length === 0) return null;

  return (
    <div className="more-projects">
      <p className="sub">{liveProjects.title}</p>
      <div className="projects">
        {projects.map((p) => (
          <article className="proj" key={p.id}>
            <h3>{p.title}</h3>
            <p>{p.excerpt}</p>
            <div className="chips">
              {(p.technologies ?? []).slice(0, 6).map((t) => (
                <span className="chip" key={t}>
                  {t}
                </span>
              ))}
            </div>
            <div className="proj-links">
              <Link href={`/projects/${p.slug}`}>Details →</Link>
              {p.github_url && (
                <a
                  href={p.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Code →
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
      <p className="more">
        <Link href="/projects">{liveProjects.all}</Link>
      </p>
    </div>
  );
}
