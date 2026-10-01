import Contact from "@/components/portfolio/Contact";
import Incidents from "@/components/portfolio/Incidents";
import { LivePosts } from "@/components/portfolio/LiveFeeds";
import Patterns from "@/components/portfolio/Patterns";
import PipelineDemo from "@/components/portfolio/PipelineDemo";
import PortfolioShell from "@/components/portfolio/PortfolioShell";
import { Clinical, Record, Writing } from "@/components/portfolio/Record";
import Results from "@/components/portfolio/Results";
import SiteFooter from "@/components/portfolio/SiteFooter";
import Skills from "@/components/portfolio/Skills";
import StackStory from "@/components/portfolio/StackStory";
import Testimonials from "@/components/portfolio/Testimonials";
import TerraformJourney from "@/components/portfolio/TerraformJourney";
import VpsStack from "@/components/portfolio/VpsStack";
import Work from "@/components/portfolio/Work";
import YouTube from "@/components/portfolio/YouTube";
import { fontVars } from "./fonts";
import "./portfolio.css";

export const metadata = {
  title: "Preview · Portfolio redesign",
  robots: { index: false },
};

// The scroll story, then the sections below it. Posts and projects added in
// the admin panel appear on their own (LiveFeeds); testimonials stay hidden
// in production until a real one is added.
export default function PreviewPage() {
  return (
    <PortfolioShell className={fontVars}>
      <StackStory />
      <div className="wrap">
        <Results />
        <Skills />
        <Work />
        <TerraformJourney />
        <PipelineDemo />
        <Patterns />
        <VpsStack />
        <Incidents />
        <Testimonials />
        <YouTube />
        <LivePosts />
        <Writing />
        <Record />
        <Clinical />
        <Contact />
        <SiteFooter />
      </div>
    </PortfolioShell>
  );
}
