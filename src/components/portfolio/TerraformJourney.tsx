import { terraformJourney } from "@/content/portfolio";

/** Four steps, from a flat config to a production stack. */
export default function TerraformJourney() {
  return (
    <section className="block" id="terraform">
      <div className="sec-head rise">
        <span className="label">{terraformJourney.label}</span>
        <h2>{terraformJourney.title}</h2>
        <p>{terraformJourney.intro}</p>
      </div>
      <ol className="tf rise">
        {terraformJourney.steps.map((s, i) => (
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
