import { fontVars } from "./fonts";

// Step 2 placeholder — proves `three` and the fonts load under the strict
// CSP. Replaced by the real page in step 3.
export const metadata = {
  title: "Preview · Portfolio redesign",
  robots: { index: false },
};

export default function PreviewPage() {
  return (
    <div className={fontVars} style={{ padding: "4rem 1.5rem" }}>
      <h1
        style={{
          fontFamily: "var(--pf-font-display)",
          fontWeight: 800,
          fontSize: "2.4rem",
        }}
      >
        Display — Bricolage Grotesque 800
      </h1>
      <p style={{ fontFamily: "var(--pf-font-body)" }}>
        Body — Hanken Grotesk 400. The quick brown fox.
      </p>
      <p style={{ fontFamily: "var(--pf-font-mono)" }}>
        Mono — JetBrains Mono 400 · 02:00 → 02:30 → 03:00
      </p>
    </div>
  );
}
