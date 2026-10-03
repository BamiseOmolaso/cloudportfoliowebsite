import Link from "next/link";
import { hero, homeHero, profile } from "@/content/portfolio";

/**
 * The home page's opening: who I am, what I do, two ways to act, and one way
 * into the detail. The scroll story that used to sit here now lives at
 * /architecture, so this stays short.
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
        <a className="btn primary" href="#contact">
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
      <Link className="built-link" href={homeHero.builtHref}>
        {homeHero.builtLabel} <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
