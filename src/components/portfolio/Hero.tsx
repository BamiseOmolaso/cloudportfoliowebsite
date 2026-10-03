import { hero, homeHero, profile } from "@/content/portfolio";

/**
 * The landing page's opening: who I am, what I do, and two ways to act. One small
 * line above the headline, no tagline below it, and the headline fits on two lines.
 */
export default function Hero({
  content = { hero, homeHero, role: profile.role },
  workHref = "#work",
}: {
  content?: { hero: typeof hero; homeHero: typeof homeHero; role: string };
  /** Where the main button goes: the Projects section, or the projects page when that section is hidden. */
  workHref?: string;
}) {
  const { hero: h, homeHero: hh, role } = content;
  return (
    <section className="home-hero" aria-labelledby="home-title">
      <span className="label">{role}</span>
      <h1 id="home-title">
        {h.headlineStart}
        <em>{h.headlineEmphasis}</em>
        {h.headlineEnd}
      </h1>
      <p>{hh.intro}</p>
      <div className="ctas">
        <a className="btn primary" href={workHref}>
          {hh.primaryCta}
        </a>
        <a
          className="btn"
          href={profile.cv}
          target="_blank"
          rel="noopener noreferrer"
        >
          {hh.secondaryCta}
        </a>
      </div>
    </section>
  );
}
