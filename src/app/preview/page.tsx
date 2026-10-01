import PortfolioShell from "@/components/portfolio/PortfolioShell";
import StackStory from "@/components/portfolio/StackStory";
import { fontVars } from "./fonts";
import "./portfolio.css";

export const metadata = {
  title: "Preview · Portfolio redesign",
  robots: { index: false },
};

// Step 5: hero + the 3D scroll story. The remaining sections arrive in
// steps 6-8.
export default function PreviewPage() {
  return (
    <PortfolioShell className={fontVars}>
      <StackStory />
    </PortfolioShell>
  );
}
