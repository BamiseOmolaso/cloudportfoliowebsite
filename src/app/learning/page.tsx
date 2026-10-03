import Patterns from "@/components/portfolio/Patterns";
import PortfolioShell from "@/components/portfolio/PortfolioShell";
import SiteFooter from "@/components/portfolio/SiteFooter";
import TerraformJourney from "@/components/portfolio/TerraformJourney";
import {
  newsletter,
  patterns,
  patternsSection,
  terraformJourney,
} from "@/content/portfolio";
import { withOverrides } from "@/content/editable";
import { getOverrides } from "@/lib/site-content";
import { fontVars } from "../fonts";

export const metadata = {
  title: "Learning",
  description:
    "How my Terraform went from one EC2 instance to a production stack, one idea at a time.",
  alternates: { canonical: "/learning" },
};

// What I am learning and how it turned into production work.
export const dynamic = "force-dynamic";

export default async function LearningPage() {
  const o = await getOverrides();
  return (
    <PortfolioShell className={fontVars} onHome={false}>
      <div className="wrap" id="main">
        <TerraformJourney
          content={withOverrides("terraformJourney", terraformJourney, o)}
        />
        <Patterns
          section={withOverrides("patternsSection", patternsSection, o)}
          items={withOverrides("patterns", patterns, o)}
        />
        <SiteFooter newsletter={withOverrides("newsletter", newsletter, o)} />
      </div>
    </PortfolioShell>
  );
}
