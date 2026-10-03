import BuiltTeaser from "@/components/portfolio/BuiltTeaser";
import Contact from "@/components/portfolio/Contact";
import Hero from "@/components/portfolio/Hero";
import { LivePosts } from "@/components/portfolio/LiveFeeds";
import PortfolioShell from "@/components/portfolio/PortfolioShell";
import Results from "@/components/portfolio/Results";
import SiteFooter from "@/components/portfolio/SiteFooter";
import Skills from "@/components/portfolio/Skills";
import Work from "@/components/portfolio/Work";
import YouTube from "@/components/portfolio/YouTube";
import { fontVars } from "./fonts";

export const metadata = { alternates: { canonical: "/" } };

// The home page is a summary: a short hero, two projects, the latest posts and
// a pointer to each full page. The heavy material lives elsewhere:
//   /architecture  the scroll story, Terraform timeline, pipeline, patterns, incidents
//   /about         where I've worked, why a doctor, building in public
//   /projects, /blog  the full lists (managed in the admin panel)
export default function HomePage() {
  return (
    <PortfolioShell className={fontVars}>
      <div className="wrap">
        <Hero />
        <Results />
        <Work />
        <BuiltTeaser />
        <LivePosts />
        <Skills />
        <YouTube />
        <Contact />
        <SiteFooter />
      </div>
    </PortfolioShell>
  );
}
