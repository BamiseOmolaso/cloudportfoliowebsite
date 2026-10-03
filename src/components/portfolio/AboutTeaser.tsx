import Link from "next/link";
import { aboutTeaser } from "@/content/portfolio";

/** A short pointer from the home page to the full About page. */
export default function AboutTeaser() {
  return (
    <section className="block" id="why-a-doctor">
      <div className="about-teaser rise">
        <h2>{aboutTeaser.title}</h2>
        <p>{aboutTeaser.body}</p>
        <Link className="btn" href={aboutTeaser.href}>
          {aboutTeaser.cta} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
