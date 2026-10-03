import { tools } from "@/content/portfolio";
import BrandIcon from "./BrandIcon";

/** The logos of the tools I build with: proof sits directly under the hero, not inside it. */
export default function ToolsStrip() {
  return (
    <div className="tools" aria-label={tools.label}>
      <span className="tools-label">{tools.label}</span>
      <ul>
        {tools.items.map((t) => (
          <li key={t}>
            <BrandIcon name={t} size={20} />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
