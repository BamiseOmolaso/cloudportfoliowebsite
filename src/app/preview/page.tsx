import Contact from "@/components/portfolio/Contact";
import Incidents from "@/components/portfolio/Incidents";
import Patterns from "@/components/portfolio/Patterns";
import PipelineDemo from "@/components/portfolio/PipelineDemo";
import PortfolioShell from "@/components/portfolio/PortfolioShell";
import { Clinical, Record, Writing } from "@/components/portfolio/Record";
import Results from "@/components/portfolio/Results";
import StackStory from "@/components/portfolio/StackStory";
import TerraformJourney from "@/components/portfolio/TerraformJourney";
import VpsStack from "@/components/portfolio/VpsStack";
import Work from "@/components/portfolio/Work";
import { fontVars } from "./fonts";
import "./portfolio.css";

export const metadata = {
  title: "Preview · Portfolio redesign",
  robots: { index: false },
};

// Steps 5-7: the scroll story, then the sections below it. Live posts and
// projects from the database arrive in step 8.
export default function PreviewPage() {
  return (
    <PortfolioShell className={fontVars}>
      <StackStory />
      <div className="wrap">
        <Results />
        <Work />
        <TerraformJourney />
        <PipelineDemo />
        <Patterns />
        <VpsStack />
        <Incidents />
        <Record />
        <Clinical />
        <Writing />
        <Contact />
      </div>
    </PortfolioShell>
  );
}
