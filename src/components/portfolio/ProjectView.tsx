import { fontVars } from "@/app/fonts";
import { projectViews } from "@/content/project-views";
import StackTabs from "./StackTabs";

/**
 * The architecture view for a project's detail page, if it has one. The diagram's
 * styles are scoped under `.pf`, so it is wrapped in a bare `.pf` (no page-sized
 * background or padding: see `.pf-embed`).
 */
export default function ProjectView({ slug }: { slug: string }) {
  const view = projectViews[slug];
  if (!view) return null;
  return (
    <div className={`pf pf-embed ${fontVars}`} data-theme="dark">
      <h2 className="embed-title">{view.heading}</h2>
      <StackTabs view={view} idPrefix={`pv-${slug}`} />
    </div>
  );
}
