import Contact from "@/components/portfolio/Contact";
import PortfolioShell from "@/components/portfolio/PortfolioShell";
import { Clinical, Record } from "@/components/portfolio/Record";
import SiteFooter from "@/components/portfolio/SiteFooter";
import {
  certifications,
  clinical,
  contact,
  experience,
  newsletter,
  record,
} from "@/content/portfolio";
import { withOverrides } from "@/content/editable";
import { isShown } from "@/content/sections";
import { getOverrides, layoutFor } from "@/lib/site-content";
import { Fragment } from "react";
import { fontVars } from "../fonts";

export const metadata = {
  title: "About",
  description:
    "Where Dr. Bamise Omolaso has worked, what they hold, why a doctor moved into cloud and DevSecOps, and what they write about.",
  alternates: { canonical: "/about" },
};

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const o = await getOverrides();
  const layout = layoutFor("about", o);
  const homeContact = isShown(layoutFor("home", o), "contact");

  const parts: Record<string, React.ReactNode> = {
    record: (
      <Record
        content={withOverrides("record", record, o)}
        jobs={withOverrides("experience", experience, o)}
        certs={withOverrides("certifications", certifications, o)}
      />
    ),
    clinical: <Clinical content={withOverrides("clinical", clinical, o)} />,
    contact: <Contact content={withOverrides("contact", contact, o)} />,
  };

  return (
    <PortfolioShell
      className={fontVars}
      onHome={false}
      contactHref={homeContact ? undefined : "/contact"}
    >
      <div className="wrap page-top" id="main">
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
