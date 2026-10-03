import { fontVars } from "@/app/fonts";
import Patterns from "./Patterns";
import PipelineDemo from "./PipelineDemo";
import TerraformJourney from "./TerraformJourney";

/** Slugs that have a long-form case study under their project page. */
export const caseStudySlugs = ["production-platform-on-hetzner"] as const;

/**
 * The long-form case study that follows a project's architecture view: how it was
 * built (Terraform timeline), how a change ships (pipeline) and the patterns used.
 */
export default function CaseStudy({ slug }: { slug: string }) {
  if (!(caseStudySlugs as readonly string[]).includes(slug)) return null;
  return (
    <div className={`pf pf-embed ${fontVars}`} data-theme="dark">
      <TerraformJourney />
      <PipelineDemo />
      <Patterns />
    </div>
  );
}
