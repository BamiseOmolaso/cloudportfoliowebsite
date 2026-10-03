import { hetznerView } from "@/content/project-views";
import StackTabs from "./StackTabs";

/** The live platform, drawn: the first thing on the case-study page. */
export default function PlatformToday() {
  return (
    <section className="block" id="today">
      <div className="sec-head rise">
        <h2>{hetznerView.heading}.</h2>
        <p>{hetznerView.intro}</p>
      </div>
      <div className="rise">
        <StackTabs view={hetznerView} idPrefix="today" />
      </div>
    </section>
  );
}
