import type { CSSProperties } from "react";
import { skillRows, skillsSection } from "@/content/portfolio";

/**
 * The stack as three sideways-scrolling rows, in the order skills were
 * learned. Pure CSS animation: it pauses on hover, and for visitors who
 * prefer reduced motion it becomes a static, wrapping list.
 */
export default function Skills() {
  return (
    <section className="block" id="stack">
      <div className="sec-head rise">
        <span className="label">{skillsSection.label}</span>
        <h2>{skillsSection.title}</h2>
        <p>{skillsSection.intro}</p>
      </div>
      <div className="legend rise">
        <span>
          <i className="dot working" aria-hidden="true" />
          {skillsSection.legend.working}
        </span>
        <span>
          <i className="dot learning" aria-hidden="true" />
          {skillsSection.legend.learning}
        </span>
      </div>
      <div className="stack rise">
        {skillRows.map((row, i) => (
          <div className="stack-row" key={row.label}>
            <span className="stack-label">{row.label}</span>
            <div
              className={`marquee${i % 2 === 1 ? " rev" : ""}`}
              style={{ "--dur": `${row.items.length * 4.5}s` } as CSSProperties}
            >
              <div className="track">
                {[false, true].map((copy) => (
                  <ul
                    className="copy"
                    key={String(copy)}
                    aria-hidden={copy || undefined}
                  >
                    {row.items.map((s) => (
                      <li className={`skill ${s.level}`} key={s.name}>
                        <i className="dot" aria-hidden="true" />
                        {s.name}
                        <span className="sr-only">
                          {" "}
                          (
                          {s.level === "working"
                            ? "used in projects"
                            : "learning"}
                          )
                        </span>
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
