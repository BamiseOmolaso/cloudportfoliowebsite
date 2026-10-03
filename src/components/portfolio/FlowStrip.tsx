import { Fragment } from "react";
import BrandIcon, { brandKey } from "./BrandIcon";

/**
 * A short chain of named steps, with a logo where the step is a known tool:
 * how a request (or a change) travels through a project. Drawn in the surrounding
 * text colour, so it works on the redesigned pages and on the older ones.
 */
export default function FlowStrip({ steps }: { steps: string[] }) {
  return (
    <ol className="flow" aria-label={`Flow: ${steps.join(", then ")}`}>
      {steps.map((s, i) => (
        <Fragment key={s}>
          {i > 0 && (
            <li className="arrow" aria-hidden="true">
              →
            </li>
          )}
          <li>
            {brandKey(s) ? (
              <BrandIcon name={s} size={14} />
            ) : (
              <span className="dot" aria-hidden="true" />
            )}
            {s}
          </li>
        </Fragment>
      ))}
    </ol>
  );
}
