import Link from "next/link";
import { projects, seeAll, work } from "@/content/portfolio";
import { ToolChip } from "./BrandIcon";
import FlowStrip from "./FlowStrip";

/** Selected work: the featured projects; the rest are on /projects. */
export default function Work({ content = work }: { content?: typeof work }) {
  return (
    <section className="block" id="work">
      <div className="sec-head rise">
        <h2>{content.title}</h2>
        <p>{content.intro}</p>
      </div>
      <div className="projects">
        {projects
          .filter((p) => p.featured)
          .map((p) => (
            <article className="proj rise" key={p.title}>
              <div className="proj-top">
                <h3>{p.title}</h3>
                <span
                  className={`status ${p.status.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {p.status}
                </span>
              </div>
              <p>{p.blurb ?? p.body}</p>
              {p.flow && <FlowStrip steps={p.flow} />}
              <div className="chips">
                {p.stack.map((t) => (
                  <ToolChip key={t} label={t} />
                ))}
              </div>
              <div className="proj-links">
                {p.links.map((l) => (
                  <a
                    className="btn primary"
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {l.label} →
                  </a>
                ))}
                {p.note && <span className="proj-note">{p.note}</span>}
              </div>
            </article>
          ))}
      </div>
      <p className="more">
        <Link className="btn primary" href={seeAll.projects.href}>
          {seeAll.projects.label} →
        </Link>
      </p>
    </section>
  );
}
