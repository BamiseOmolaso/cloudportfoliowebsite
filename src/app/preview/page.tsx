import PortfolioShell from "@/components/portfolio/PortfolioShell";
import { fontVars } from "./fonts";
import "./portfolio.css";

export const metadata = {
  title: "Preview · Portfolio redesign",
  robots: { index: false },
};

// Step 3: shell + a static hero (no 3D yet). The 3D scene arrives in step 5,
// the remaining sections in steps 6-8.
export default function PreviewPage() {
  return (
    <PortfolioShell className={fontVars}>
      <div className="runway" style={{ height: "100svh" }}>
        <div className="stage">
          <div className="cards">
            <div className="card hero on">
              <span className="label">
                Cloud and DevSecOps engineer · former medical doctor
              </span>
              <h1>
                Cloud systems that are <em>secure,</em> repeatable and cheap to
                run.
              </h1>
              <p>
                Dr. Bamise Omolaso. This is the real infrastructure behind this
                site, in 3D. Scroll to follow one request through it.
              </p>
              <div className="ctas">
                <a className="btn primary" href="#contact">
                  Work with me
                </a>
                <a
                  className="btn"
                  href="https://portfolio.oluwabamiseomolaso.com.ng/cv/Oluwabamise%20Omolaso_CV_2025.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View CV
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PortfolioShell>
  );
}
