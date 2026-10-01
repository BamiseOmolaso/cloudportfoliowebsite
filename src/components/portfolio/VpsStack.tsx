"use client";

import { useState } from "react";
import { vpsStack } from "@/content/architecture";
import { vps } from "@/content/portfolio";
import ArchitectureDiagram from "./ArchitectureDiagram";

/**
 * The single-server stack, drawn with the same diagram engine as the AWS
 * story. Three tabs (request path, backups, hardening) each zoom to their
 * part of the diagram and explain it.
 */
export default function VpsStack() {
  const [tab, setTab] = useState(0);
  const current = vps.tabs[tab];

  return (
    <section className="block vps" id="vps">
      <div className="sec-head rise">
        <span className="label">{vps.label}</span>
        <h2>{vps.title}</h2>
        <p>{vps.intro}</p>
      </div>
      <div className="vps-grid rise">
        <div className="vps-copy">
          <div
            className="tabs"
            role="tablist"
            aria-label="Parts of the server stack"
          >
            {vps.tabs.map((t, i) => (
              <button
                key={t.name}
                type="button"
                role="tab"
                id={`vps-tab-${i}`}
                aria-selected={tab === i}
                aria-controls="vps-panel"
                className={tab === i ? "on" : ""}
                onClick={() => setTab(i)}
              >
                {t.name}
              </button>
            ))}
          </div>
          <div
            className="vps-panel"
            role="tabpanel"
            id="vps-panel"
            aria-labelledby={`vps-tab-${tab}`}
          >
            <h3>{current.title}</h3>
            <p>{current.body}</p>
            <ul>
              {current.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="vps-diagram">
          <ArchitectureDiagram diagram={vpsStack} step={tab} paused={false} />
        </div>
      </div>
    </section>
  );
}
