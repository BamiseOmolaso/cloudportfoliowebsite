import { terraformJourney } from "@/content/portfolio";

/** Four steps, from a flat config to a production stack. */
export default function TerraformJourney({
  content = terraformJourney,
}: {
  content?: typeof terraformJourney;
}) {
  return (
    <section className="block" id="terraform">
      <div className="sec-head rise">
        <span className="label">{content.label}</span>
        <h2>{content.title}</h2>
        <p>{content.intro}</p>
      </div>
      <ol className="tf rise">
        {content.steps.map((s, i) => (
          <li className="tf-step" key={s.title}>
            <span className="tf-n" aria-hidden="true">
              {i + 1}
            </span>
            <span className="tf-when">{s.when}</span>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
            <span className="chip">{s.concept}</span>
            <a
              className="tf-link"
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              See the code →
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
