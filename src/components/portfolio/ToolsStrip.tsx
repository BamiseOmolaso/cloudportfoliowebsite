import { tools } from "@/content/portfolio";
import BrandIcon, { brandKey } from "./BrandIcon";

/**
 * The tools I build with, large and moving across, one row for each track (cloud, then
 * data; the second row runs the other way): proof sits directly under the hero, not
 * inside it. Each list is drawn twice so the loop has no seam; the second copy is hidden
 * from screen readers. With reduced motion each is a still, wrapped row.
 */
export default function ToolsStrip() {
  return (
    <div className="tools" aria-label={tools.label}>
      <span className="tools-label">{tools.label}</span>
      {tools.rows.map((row, i) => (
        <div className="tools-row" key={row.name}>
          <span className="tools-row-name">{row.name}</span>
          <div
            className={i % 2 ? "marquee rev" : "marquee"}
            style={{ ["--dur" as string]: "36s" }}
          >
            <div className="track">
              {[0, 1].map((n) => (
                <ul className="copy" key={n} aria-hidden={n === 1 || undefined}>
                  {row.items.map((t) => (
                    <li key={t}>
                      {brandKey(t) ? (
                        <BrandIcon name={t} size={44} />
                      ) : (
                        <span className="tool-mark" aria-hidden="true">
                          {tools.marks[t]}
                        </span>
                      )}
                      {t}
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
