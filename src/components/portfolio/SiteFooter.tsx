import Link from "next/link";
import { footerLinks, profile } from "@/content/portfolio";
import Newsletter from "./Newsletter";

/** The newsletter, the site links (the header hides these on phones) and the sign-off. */
export default function SiteFooter() {
  return (
    <footer className="site-foot">
      <div className="foot-grid">
        <Newsletter />
        <nav aria-label="Footer">
          {footerLinks.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="foot-base">
        <span>{profile.fullName}</span>
        <span>{profile.location}</span>
      </div>
    </footer>
  );
}
