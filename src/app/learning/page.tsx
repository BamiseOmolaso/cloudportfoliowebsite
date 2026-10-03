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
import { isShown } from "@/content/sections";
import { getOverrides, layoutFor } from "@/lib/site-content";
import { Fragment } from "react";
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
  const layout = layoutFor("learning", o);
  const homeContact = isShown(layoutFor("home", o), "contact");

  const parts: Record<string, React.ReactNode> = {
    journey: (
      <TerraformJourney
        content={withOverrides("terraformJourney", terraformJourney, o)}
      />
    ),
    patterns: (
      <Patterns
        section={withOverrides("patternsSection", patternsSection, o)}
        items={withOverrides("patterns", patterns, o)}
      />
    ),
  };

  return (
    <PortfolioShell
      className={fontVars}
      onHome={false}
      contactHref={homeContact ? undefined : "/contact"}
    >
      <div className="wrap" id="main">
        {layout
          .filter((s) => s.visible)
          .map((s) => (
            <Fragment key={s.id}>{parts[s.id]}</Fragment>
          ))}
        <SiteFooter newsletter={withOverrides("newsletter", newsletter, o)} />
      </div>
    </PortfolioShell>
  );
}
