import { tools } from "@/content/portfolio";
import BrandIcon from "./BrandIcon";

/**
 * The logos of the tools I build with, large and moving across: proof sits directly
 * under the hero, not inside it. The list is drawn twice so the loop has no seam; the
 * second copy is hidden from screen readers. With reduced motion it is a still, wrapped row.
 */
export default function ToolsStrip() {
  return (
    <div className="tools" aria-label={tools.label}>
      <span className="tools-label">{tools.label}</span>
      <div className="marquee" style={{ ["--dur" as string]: "36s" }}>
        <div className="track">
          {[0, 1].map((n) => (
            <ul className="copy" key={n} aria-hidden={n === 1 || undefined}>
              {tools.items.map((t) => (
                <li key={t}>
                  <BrandIcon name={t} size={44} />
                  {t}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  );
}
