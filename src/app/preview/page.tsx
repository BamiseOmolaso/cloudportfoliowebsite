import Contact from "@/components/portfolio/Contact";
import Patterns from "@/components/portfolio/Patterns";
import PipelineDemo from "@/components/portfolio/PipelineDemo";
import PortfolioShell from "@/components/portfolio/PortfolioShell";
import { Clinical, Record, Writing } from "@/components/portfolio/Record";
import Results from "@/components/portfolio/Results";
import StackStory from "@/components/portfolio/StackStory";
import { fontVars } from "./fonts";
import "./portfolio.css";

export const metadata = {
  title: "Preview · Portfolio redesign",
  robots: { index: false },
};

// Steps 5-6: the scroll story, then the sections below it. Live posts and
// projects from the database arrive in step 8.
export default function PreviewPage() {
  return (
    <PortfolioShell className={fontVars}>
      <StackStory />
      <div className="wrap">
        <Results />
        <PipelineDemo />
        <Patterns />
        <Record />
        <Clinical />
        <Writing />
        <Contact />
      </div>
    </PortfolioShell>
  );
}
