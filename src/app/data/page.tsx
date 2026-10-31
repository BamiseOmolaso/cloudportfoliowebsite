import PortfolioShell from "@/components/portfolio/PortfolioShell";
import SiteFooter from "@/components/portfolio/SiteFooter";
import TrackPage from "@/components/portfolio/TrackPage";
import { newsletter } from "@/content/portfolio";
import { withOverrides } from "@/content/editable";
import { isShown } from "@/content/sections";
import { getOverrides, layoutFor } from "@/lib/site-content";
import { fontVars } from "../fonts";

export const metadata = {
  title: "Data projects",
  description:
    "Data projects: dashboards, forecasting and machine-learning models, with live apps and code where public.",
  alternates: { canonical: "/data" },
};

export const dynamic = "force-dynamic";

export default async function DataPage() {
  const o = await getOverrides();
  const homeContact = isShown(layoutFor("home", o), "contact");

  return (
    <PortfolioShell
      className={fontVars}
      onHome={false}
      contactHref={homeContact ? undefined : "/contact"}
    >
      <div className="wrap page-top" id="main">
        <TrackPage track="data" />
        <SiteFooter newsletter={withOverrides("newsletter", newsletter, o)} />
      </div>
    </PortfolioShell>
  );
}
