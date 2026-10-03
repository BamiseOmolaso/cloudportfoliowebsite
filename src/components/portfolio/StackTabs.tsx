"use client";

import { useState } from "react";
import type { StackView } from "@/content/project-views";
import ArchitectureDiagram from "./ArchitectureDiagram";

/**
 * Tabs on the left, the diagram on the right. Each tab zooms the diagram to its
 * part and explains it. `idPrefix` keeps element ids unique when more than one
 * is on a page.
 */
export default function StackTabs({
  view,
  idPrefix,
}: {
  view: StackView;
  idPrefix: string;
}) {
  const [tab, setTab] = useState(0);
  const current = view.tabs[tab];

  return (
    <div className="vps-grid">
      <div className="vps-copy">
        <div className="tabs" role="tablist" aria-label={view.heading}>
          {view.tabs.map((t, i) => (
            <button
              key={t.name}
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${i}`}
              aria-selected={tab === i}
              aria-controls={`${idPrefix}-panel`}
              className={tab === i ? "on" : ""}
              onClick={() => setTab(i)}
            >
              {t.name}
            </button>
          ))}
        </div>
        {view.tabs.length > 1 && (
          <p className="tab-hint">
            Go step by step: step {tab + 1} of {view.tabs.length}. The diagram
            highlights the part being explained.
          </p>
        )}
        <div
          className="vps-panel"
          role="tabpanel"
          id={`${idPrefix}-panel`}
          aria-labelledby={`${idPrefix}-tab-${tab}`}
        >
          <h3>{current.title}</h3>
          <p>{current.body}</p>
          {current.points.length > 0 && (
            <ul>
              {current.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          {tab < view.tabs.length - 1 && (
            <button
              type="button"
              className="btn primary tab-next"
              onClick={() => setTab(tab + 1)}
            >
              Next step →
            </button>
          )}
        </div>
      </div>
      <div className="vps-diagram">
        <ArchitectureDiagram
          diagram={view.diagram}
          step={Math.min(tab, view.diagram.steps.length - 1)}
          paused={view.paused ?? false}
        />
      </div>
    </div>
  );
}
