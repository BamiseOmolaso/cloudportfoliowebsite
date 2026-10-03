import Contact from "@/components/portfolio/Contact";
import PortfolioShell from "@/components/portfolio/PortfolioShell";
import { Clinical, Record } from "@/components/portfolio/Record";
import SiteFooter from "@/components/portfolio/SiteFooter";
import { fontVars } from "../fonts";

export const metadata = {
  title: "About",
  description:
    "Where Dr. Bamise Omolaso has worked, what they hold, why a doctor moved into cloud and DevSecOps, and what they write about.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <PortfolioShell className={fontVars} onHome={false}>
      <div className="wrap page-top" id="main">
        <Record />
        <Clinical />
        <Contact />
        <SiteFooter />
      </div>
    </PortfolioShell>
  );
}
