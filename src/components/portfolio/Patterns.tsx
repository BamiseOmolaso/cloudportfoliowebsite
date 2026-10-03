import Link from "next/link";
import { patterns, patternsSection, seeAll } from "@/content/portfolio";
import PatternVisual from "./PatternVisual";

/** The patterns I use. `limit` shows the first few (the home page) with a link to all of them. */
export default function Patterns({ limit }: { limit?: number }) {
  const shown = limit ? patterns.slice(0, limit) : patterns;
  return (
    <section className="block" id="patterns">
      <div className="sec-head rise">
        <span className="label">{patternsSection.label}</span>
        <h2>{patternsSection.title}</h2>
        <p>{patternsSection.intro}</p>
      </div>
      <div className={`patterns${limit === 2 ? " two" : ""}`}>
        {shown.map((p) => (
          <article className="pat rise" key={p.title}>
            <PatternVisual pattern={p} />
            <div className="body">
              <h3>{p.title}</h3>
              <p>{p.body}</p>
              <span className="used">Used in: {p.usedIn}</span>
            </div>
          </article>
        ))}
      </div>
      {limit && limit < patterns.length && (
        <p className="more">
          <Link className="btn primary" href={seeAll.patterns.href}>
            {seeAll.patterns.label} →
          </Link>
        </p>
      )}
    </section>
  );
}
