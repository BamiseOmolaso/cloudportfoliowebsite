import Link from "next/link";
import { builtTeaser } from "@/content/portfolio";

/** A short pointer from the home page to /architecture. */
export default function BuiltTeaser() {
  return (
    <section className="block" id="built">
      <div className="built rise">
        <span className="label">{builtTeaser.label}</span>
        <h2>{builtTeaser.title}</h2>
        <p>{builtTeaser.body}</p>
        <div className="chips">
          {builtTeaser.chips.map((c) => (
            <span className="chip" key={c}>
              {c}
            </span>
          ))}
        </div>
        <Link className="btn primary" href={builtTeaser.href}>
          {builtTeaser.cta} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
