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
import { getOverrides } from "@/lib/site-content";
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
  return (
    <PortfolioShell className={fontVars} onHome={false}>
      <div className="wrap page-top" id="main">
        <Record
          content={withOverrides("record", record, o)}
          jobs={withOverrides("experience", experience, o)}
          certs={withOverrides("certifications", certifications, o)}
        />
        <Clinical content={withOverrides("clinical", clinical, o)} />
        <Contact content={withOverrides("contact", contact, o)} />
        <SiteFooter newsletter={withOverrides("newsletter", newsletter, o)} />
      </div>
    </PortfolioShell>
  );
}
