import Link from "next/link";
import { projectsByTrack, tracks, type TrackId } from "@/content/portfolio";
import { ToolChip } from "./BrandIcon";
import FlowStrip from "./FlowStrip";

/** The projects of one track (data or cloud), drawn like the home page's selected work. */
export default function TrackPage({ track }: { track: TrackId }) {
  const t = tracks[track];
  const other = tracks[track === "data" ? "cloud" : "data"];
  return (
    <section className="block" aria-labelledby="track-title">
      <div className="sec-head rise">
        <span className="label">{t.label}</span>
        <h2 id="track-title">{t.title}</h2>
        <p>{t.intro}</p>
      </div>
      <div className="projects">
        {projectsByTrack[track].map((p) => (
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
              {p.stack.map((s) => (
                <ToolChip key={s} label={s} />
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
        <Link className="btn" href={other.href}>
          {other.cardTitle} →
        </Link>
      </p>
    </section>
  );
}
