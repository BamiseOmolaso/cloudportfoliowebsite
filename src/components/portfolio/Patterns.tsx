import { patterns, patternsSection } from "@/content/portfolio";
import PatternVisual from "./PatternVisual";

export default function Patterns() {
  return (
    <section className="block" id="patterns">
      <div className="sec-head rise">
        <span className="label">{patternsSection.label}</span>
        <h2>{patternsSection.title}</h2>
        <p>{patternsSection.intro}</p>
      </div>
      <div className="patterns">
        {patterns.map((p) => (
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
    </section>
  );
}
