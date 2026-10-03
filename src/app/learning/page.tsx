import Patterns from "@/components/portfolio/Patterns";
import PortfolioShell from "@/components/portfolio/PortfolioShell";
import SiteFooter from "@/components/portfolio/SiteFooter";
import TerraformJourney from "@/components/portfolio/TerraformJourney";
import { fontVars } from "../fonts";

export const metadata = {
  title: "Learning",
  description:
    "How my Terraform went from one EC2 instance to a production stack, one idea at a time.",
  alternates: { canonical: "/learning" },
};

// What I am learning and how it turned into production work.
export default function LearningPage() {
  return (
    <PortfolioShell className={fontVars} onHome={false}>
      <div className="wrap" id="main">
        <TerraformJourney />
        <Patterns />
        <SiteFooter />
      </div>
    </PortfolioShell>
  );
}
