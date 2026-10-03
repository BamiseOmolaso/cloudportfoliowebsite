import { fontVars } from "@/app/fonts";
import { Writing } from "./Record";

/** Where else I write, shown under the posts on /blog. (The lessons-learnt write-ups are blog posts now.) */
export default function Lessons() {
  return (
    <div className={`pf pf-embed ${fontVars}`} data-theme="dark">
      <Writing />
    </div>
  );
}
