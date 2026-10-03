"use client";

import { vps } from "@/content/portfolio";
import { vpsView } from "@/content/project-views";
import StackTabs from "./StackTabs";

/** The single-server stack: the same diagram engine and tabs as the other projects. */
export default function VpsStack() {
  return (
    <section className="block vps" id="vps">
      <div className="sec-head rise">
        <span className="label">{vps.label}</span>
        <h2>{vps.title}</h2>
        <p>{vps.intro}</p>
      </div>
      <div className="rise">
        <StackTabs view={vpsView} idPrefix="vps" />
      </div>
    </section>
  );
}
