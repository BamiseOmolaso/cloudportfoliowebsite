import Link from "next/link";
import { platformFeature, seeAll } from "@/content/portfolio";
import { hetznerView } from "@/content/project-views";
import StackTabs from "./StackTabs";

/**
 * The platform this site runs on, drawn on the landing page, with a link to the
 * full case study (which lives under Projects).
 */
export default function PlatformFeature() {
  return (
    <section className="block" id="platform">
      <div className="sec-head rise">
        <h2>{platformFeature.title}</h2>
        <p>{platformFeature.intro}</p>
      </div>
      <div className="rise">
        <StackTabs view={hetznerView} idPrefix="home-platform" />
      </div>
      <p className="more">
        <Link href={seeAll.platform.href}>{seeAll.platform.label} →</Link>
      </p>
    </section>
  );
}
