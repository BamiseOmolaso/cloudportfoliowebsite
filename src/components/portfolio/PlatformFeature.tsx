import Link from "next/link";
import { platformFeature, seeAll } from "@/content/portfolio";
import { hetznerView } from "@/content/project-views";
import StackTabs from "./StackTabs";

/**
 * The platform this site runs on, drawn on the landing page, with a link to the
 * full case study (which lives under Projects).
 */
export default function PlatformFeature({
  content = platformFeature,
}: {
  content?: { title: string; intro: string };
}) {
  return (
    <section className="block" id="platform">
      <div className="sec-head rise">
        <h2>{content.title}</h2>
        <p>{content.intro}</p>
      </div>
      <div className="rise">
        <StackTabs view={hetznerView} idPrefix="home-platform" />
      </div>
      <p className="more">
        <Link className="btn primary" href={seeAll.platform.href}>
          {seeAll.platform.label} →
        </Link>
      </p>
    </section>
  );
}
