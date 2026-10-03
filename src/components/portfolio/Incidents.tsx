import { incidents } from "@/content/portfolio";

/** What went wrong in production, what changed, and the lesson. */
export default function Incidents() {
  return (
    <section className="block" id="fixed">
      <div className="sec-head rise">
        <span className="label">{incidents.label}</span>
        <h2>{incidents.title}</h2>
        <p>{incidents.intro}</p>
      </div>
      <div className="fixes">
        {incidents.items.map((it) => (
          <article className="fix rise" key={it.title}>
            <h3>{it.title}</h3>
            <p>
              <b>What happened.</b> {it.happened}
            </p>
            <p>
              <b>What I changed.</b> {it.changed}
            </p>
            <p className="lesson">
              <span>Lesson</span> {it.lesson}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
