import { hero, homeHero, profile } from "@/content/portfolio";

/**
 * The landing page's opening: who I am, what I do, and two ways to act. One small
 * line above the headline, no tagline below it, and the headline fits on two lines.
 */
export default function Hero() {
  return (
    <section className="home-hero" aria-labelledby="home-title">
      <span className="label">{profile.role}</span>
      <h1 id="home-title">
        {hero.headlineStart}
        <em>{hero.headlineEmphasis}</em>
        {hero.headlineEnd}
      </h1>
      <p>{homeHero.intro}</p>
      <div className="ctas">
        <a className="btn primary" href="#work">
          {homeHero.primaryCta}
        </a>
        <a
          className="btn"
          href={profile.cv}
          target="_blank"
          rel="noopener noreferrer"
        >
          {homeHero.secondaryCta}
        </a>
      </div>
    </section>
  );
}
