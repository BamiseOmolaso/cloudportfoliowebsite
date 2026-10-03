import Incidents from "@/components/portfolio/Incidents";
import Patterns from "@/components/portfolio/Patterns";
import PipelineDemo from "@/components/portfolio/PipelineDemo";
import PlatformToday from "@/components/portfolio/PlatformToday";
import PortfolioShell from "@/components/portfolio/PortfolioShell";
import { Writing } from "@/components/portfolio/Record";
import SiteFooter from "@/components/portfolio/SiteFooter";
import StackStory from "@/components/portfolio/StackStory";
import TerraformJourney from "@/components/portfolio/TerraformJourney";
import VpsStack from "@/components/portfolio/VpsStack";
import { fontVars } from "../fonts";

export const metadata = {
  title: "How this site is built",
  description:
    "The case study behind this portfolio: the platform it runs on today, the AWS design it was built for, the Terraform timeline, the deployment pipeline, the patterns used and what broke along the way.",
  alternates: { canonical: "/architecture" },
};

// The case study for the "Production platform" and "Cloud portfolio" projects.
// The AWS scroll story opens the page, the live platform follows it, and the
// lessons (incidents, writing) close it.
export default function ArchitecturePage() {
  return (
    <PortfolioShell className={fontVars} onHome={false}>
      <StackStory />
      <div className="wrap" id="main">
        <PlatformToday />
        <TerraformJourney />
        <PipelineDemo />
        <Patterns />
        <VpsStack />
        <Incidents />
        <Writing />
        <SiteFooter />
      </div>
    </PortfolioShell>
  );
}
