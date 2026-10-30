import Link from "next/link";
import { trackChoice, tracks } from "@/content/portfolio";
import { ToolChip } from "./BrandIcon";

/** The home page's two doors: one into the data projects, one into the cloud projects. */
export default function Tracks({
  content = trackChoice,
}: {
  content?: typeof trackChoice;
}) {
  return (
    <section className="block" id="tracks" aria-labelledby="tracks-title">
      <div className="sec-head rise">
        <h2 id="tracks-title">{content.title}</h2>
      </div>
      <div className="doors">
        {[tracks.data, tracks.cloud].map((t) => (
          <Link className="door rise" href={t.href} key={t.id}>
            <span className="label">{t.label}</span>
            <h3>{t.cardTitle}</h3>
            <p>{t.cardBody}</p>
            <span className="chips">
              {t.tools.map((tool) => (
                <ToolChip key={tool} label={tool} />
              ))}
            </span>
            <span className="btn primary">{t.cardTitle} →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
