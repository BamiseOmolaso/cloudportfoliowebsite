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
import { getOverrides } from "@/lib/site-content";
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
  return (
    <PortfolioShell className={fontVars}>
      <div className="wrap">
        <Hero
          content={{
            hero: withOverrides("hero", hero, o),
            homeHero: withOverrides("homeHero", homeHero, o),
            role: withOverrides("profile", profile, o).role,
          }}
        />
        <ToolsStrip />
        <Results />
        <Work content={withOverrides("work", work, o)} />
        <PlatformFeature
          content={withOverrides("platformFeature", platformFeature, o)}
        />
        <PipelineDemo />
        <Patterns
          limit={2}
          section={withOverrides("patternsSection", patternsSection, o)}
          items={withOverrides("patterns", patterns, o)}
        />
        <LivePosts />
        <YouTube />
        <Contact content={withOverrides("contact", contact, o)} />
        <SiteFooter newsletter={withOverrides("newsletter", newsletter, o)} />
      </div>
    </PortfolioShell>
  );
}
