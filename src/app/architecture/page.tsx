import Incidents from "@/components/portfolio/Incidents";
import Patterns from "@/components/portfolio/Patterns";
import PipelineDemo from "@/components/portfolio/PipelineDemo";
import PortfolioShell from "@/components/portfolio/PortfolioShell";
import SiteFooter from "@/components/portfolio/SiteFooter";
import StackStory from "@/components/portfolio/StackStory";
import TerraformJourney from "@/components/portfolio/TerraformJourney";
import VpsStack from "@/components/portfolio/VpsStack";
import { fontVars } from "../fonts";

export const metadata = {
  title: "How this site is built",
  description:
    "The infrastructure behind this portfolio: the AWS design, the Terraform timeline, the deployment pipeline, the patterns used and the incidents that taught the most.",
  alternates: { canonical: "/architecture" },
};

// The material that used to crowd the home page: the scroll story first, then
// the detail underneath it.
export default function ArchitecturePage() {
  return (
    <PortfolioShell className={fontVars} onHome={false}>
      <StackStory />
      <div className="wrap" id="main">
        <TerraformJourney />
        <PipelineDemo />
        <Patterns />
        <VpsStack />
        <Incidents />
        <SiteFooter />
      </div>
    </PortfolioShell>
  );
}
