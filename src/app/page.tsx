import Contact from "@/components/portfolio/Contact";
import Hero from "@/components/portfolio/Hero";
import { LivePosts } from "@/components/portfolio/LiveFeeds";
import Patterns from "@/components/portfolio/Patterns";
import PipelineDemo from "@/components/portfolio/PipelineDemo";
import PlatformFeature from "@/components/portfolio/PlatformFeature";
import PortfolioShell from "@/components/portfolio/PortfolioShell";
import Results from "@/components/portfolio/Results";
import SiteFooter from "@/components/portfolio/SiteFooter";
import ToolsStrip from "@/components/portfolio/ToolsStrip";
import Work from "@/components/portfolio/Work";
import YouTube from "@/components/portfolio/YouTube";
import {
  contact,
  hero,
  homeHero,
  newsletter,
  patterns,
  patternsSection,
  platformFeature,
  profile,
  work,
} from "@/content/portfolio";
import { withOverrides } from "@/content/editable";
import { isShown } from "@/content/sections";
import { getOverrides, layoutFor } from "@/lib/site-content";
import { Fragment } from "react";
import { fontVars } from "./fonts";

export const metadata = { alternates: { canonical: "/" } };

// Text edited in the admin panel is read per request.
export const dynamic = "force-dynamic";

// The landing page, in the order a visitor decides to hire someone:
//   Attention  the hero and the tools I build with
//   Interest   the numbers, featured projects, the platform this site runs on, how a change
//              ships, the patterns I use, then the latest posts
//   Desire     the teaching channel
//   Action     one clear way to get in touch
// Each section shows a few items and links to a full page, so nothing is said twice:
//   /projects, /blog   the full lists (managed in the admin panel)
//   /projects/production-platform-on-hetzner   the platform in full
//   /learning          how my Terraform went from one server to a production stack
//   /about             where I've worked and why a doctor (in the menu, not repeated here)
export default async function HomePage() {
  const o = await getOverrides();
  const layout = layoutFor("home", o);
  const shown = (id: string) => isShown(layout, id);

  // Each section as it has always been drawn; only the order and which ones appear change.
  const parts: Record<string, React.ReactNode> = {
    hero: (
      <Hero
        workHref={shown("work") ? "#work" : "/projects"}
        content={{
          hero: withOverrides("hero", hero, o),
          homeHero: withOverrides("homeHero", homeHero, o),
          role: withOverrides("profile", profile, o).role,
        }}
      />
    ),
    tools: <ToolsStrip />,
    results: <Results />,
    work: <Work content={withOverrides("work", work, o)} />,
    platform: (
      <PlatformFeature
        content={withOverrides("platformFeature", platformFeature, o)}
      />
    ),
    pipeline: <PipelineDemo />,
    patterns: (
      <Patterns
        limit={2}
        section={withOverrides("patternsSection", patternsSection, o)}
        items={withOverrides("patterns", patterns, o)}
      />
    ),
    posts: <LivePosts />,
    youtube: <YouTube />,
    contact: <Contact content={withOverrides("contact", contact, o)} />,
  };

  return (
    <PortfolioShell
      className={fontVars}
      contactHref={shown("contact") ? undefined : "/contact"}
    >
      <div className="wrap">
        {layout
          .filter((s) => s.visible)
          .map((s) => (
            <Fragment key={s.id}>{parts[s.id]}</Fragment>
          ))}
        <SiteFooter newsletter={withOverrides("newsletter", newsletter, o)} />
      </div>
    </PortfolioShell>
  );
}
