import Link from "next/link";
import { db } from "@/lib/db";
import { EDITABLE_PAGES } from "@/content/editable";
import { Card, PageHeader, button } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

async function getStats() {
  try {
    const [
      subscribers,
      newsletters,
      projects,
      publishedProjects,
      posts,
      publishedPosts,
      unread,
      edited,
    ] = await Promise.all([
      db.newsletterSubscriber.count({ where: { isSubscribed: true } }),
      db.newsletter.count({ where: { status: "sent" } }),
      db.project.count(),
      db.project.count({ where: { status: "published" } }),
      db.blogPost.count(),
      db.blogPost.count({ where: { status: "published" } }),
      db.contactMessage.count({ where: { read: false } }),
      db.siteContent.count(),
    ]);
    return {
      subscribers,
      newsletters,
      projects,
      publishedProjects,
      posts,
      publishedPosts,
      unread,
      edited,
    };
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return null;
  }
}

export default async function AdminDashboard() {
  const s = await getStats();
  const tiles = [
    {
      label: "Blog posts",
      value: s?.posts,
      note: `${s?.publishedPosts ?? 0} published`,
      href: "/admin/blog",
    },
    {
      label: "Projects",
      value: s?.projects,
      note: `${s?.publishedProjects ?? 0} published`,
      href: "/admin/projects",
    },
    {
      label: "Unread messages",
      value: s?.unread,
      note: "from the contact form",
      href: "/admin/messages",
    },
    {
      label: "Subscribers",
      value: s?.subscribers,
      note: `${s?.newsletters ?? 0} newsletters sent`,
      href: "/admin/subscribers",
    },
  ];

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="Everything on the site, in one place."
        actions={
          <>
            <Link href="/admin/blog/new" className={button("primary")}>
              New post
            </Link>
            <Link href="/admin/projects/new" className={button("secondary")}>
              New project
            </Link>
          </>
        }
      />
      {!s && (
        <p
          role="alert"
          className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300"
        >
          The numbers could not be loaded. The database may be unreachable.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="group">
            <Card className="h-full p-5 transition-colors group-hover:border-gray-600">
              <p className="text-sm text-gray-400">{t.label}</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {t.value ?? "–"}
              </p>
              <p className="mt-1 text-xs text-gray-500">{t.note}</p>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 mt-10 text-lg font-semibold text-white">
        Edit the pages
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {EDITABLE_PAGES.map((p) => (
          <Link key={p.id} href={`/admin/pages/${p.id}`} className="group">
            <Card className="h-full p-5 transition-colors group-hover:border-gray-600">
              <p className="font-medium text-white">{p.title}</p>
              <p className="mt-1 text-xs text-gray-400">{p.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
