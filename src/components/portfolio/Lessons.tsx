import { fontVars } from "@/app/fonts";
import Incidents from "./Incidents";
import { Writing } from "./Record";

/** What broke and what I learnt, shown under the posts on /blog. */
export default function Lessons() {
  return (
    <div className={`pf pf-embed ${fontVars}`} data-theme="dark">
      <Incidents />
      <Writing />
    </div>
  );
}
