import PortfolioShell from "@/components/portfolio/PortfolioShell";
import SiteFooter from "@/components/portfolio/SiteFooter";
import TrackPage from "@/components/portfolio/TrackPage";
import { newsletter } from "@/content/portfolio";
import { withOverrides } from "@/content/editable";
import { isShown } from "@/content/sections";
import { getOverrides, layoutFor } from "@/lib/site-content";
import { fontVars } from "../fonts";

export const metadata = {
  title: "Cloud projects",
  description:
    "Cloud projects: infrastructure as code, Kubernetes and CI/CD, built and run in production.",
  alternates: { canonical: "/cloud" },
};

export const dynamic = "force-dynamic";

export default async function CloudPage() {
  const o = await getOverrides();
  const homeContact = isShown(layoutFor("home", o), "contact");

  return (
    <PortfolioShell
      className={fontVars}
      onHome={false}
      contactHref={homeContact ? undefined : "/contact"}
    >
      <div className="wrap page-top" id="main">
        <TrackPage track="cloud" />
        <SiteFooter newsletter={withOverrides("newsletter", newsletter, o)} />
      </div>
    </PortfolioShell>
  );
}
