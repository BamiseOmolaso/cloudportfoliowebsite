import AboutTeaser from "@/components/portfolio/AboutTeaser";
import Contact from "@/components/portfolio/Contact";
import Hero from "@/components/portfolio/Hero";
import { LivePosts } from "@/components/portfolio/LiveFeeds";
import PortfolioShell from "@/components/portfolio/PortfolioShell";
import Results from "@/components/portfolio/Results";
import SiteFooter from "@/components/portfolio/SiteFooter";
import ToolsStrip from "@/components/portfolio/ToolsStrip";
import Work from "@/components/portfolio/Work";
import YouTube from "@/components/portfolio/YouTube";
import { fontVars } from "./fonts";

export const metadata = { alternates: { canonical: "/" } };

// The landing page, in the order a visitor decides to hire someone:
//   Attention  the hero and the tools I build with
//   Interest   the numbers, then the featured projects and the latest posts
//   Desire     why a doctor, and the teaching channel
//   Action     one clear way to get in touch
// Each section shows a few items and links to a full page, so nothing is said twice:
//   /projects, /blog   the full lists (managed in the admin panel)
//   /architecture      the case study of how this site is built
//   /about             where I've worked and why a doctor
export default function HomePage() {
  return (
    <PortfolioShell className={fontVars}>
      <div className="wrap">
        <Hero />
        <ToolsStrip />
        <Results />
        <Work />
        <LivePosts />
        <AboutTeaser />
        <YouTube />
        <Contact />
        <SiteFooter />
      </div>
    </PortfolioShell>
  );
}
