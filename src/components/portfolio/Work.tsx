import Link from "next/link";
import { projects, seeAll, work } from "@/content/portfolio";

/** Selected work: the featured projects; the rest are on /projects. */
export default function Work() {
  return (
    <section className="block" id="work">
      <div className="sec-head rise">
        <span className="label">{work.label}</span>
        <h2>{work.title}</h2>
        <p>{work.intro}</p>
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
              <p>{p.body}</p>
              <div className="chips">
                {p.stack.map((t) => (
                  <span className="chip" key={t}>
                    {t}
                  </span>
                ))}
              </div>
              <div className="proj-links">
                {p.links.map((l) => (
                  <a
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
        <Link href={seeAll.projects.href}>{seeAll.projects.label} →</Link>
      </p>
    </section>
  );
}
