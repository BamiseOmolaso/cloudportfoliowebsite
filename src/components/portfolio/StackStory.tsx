"use client";

import { useEffect, useRef, useState } from "react";
import { awsStack } from "@/content/architecture";
import { cost, hero, profile, story, tour } from "@/content/portfolio";
import ArchitectureDiagram from "./ArchitectureDiagram";

/** The hero plus one step per story card. */
const STEPS = story.length + 1;
const STEP_NAMES = ["Intro", ...story.map((s) => s.rail)];

/**
 * The scroll story: a tall "runway" with a sticky stage. As the visitor
 * scrolls, the active step changes, the architecture diagram zooms to that
 * step's part of the stack and the matching card fades in.
 *
 * Scrolling isn't the only way through it: every card has Back / Next
 * buttons, the progress rail is clickable, and the hero has an explicit
 * "follow one request" button. All of them just scroll the page to the right
 * spot, so scroll position stays the single source of truth.
 */
export default function StackStory() {
  const runwayRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const lastStep = useRef(0);

  const [step, setStep] = useState(0);
  // null = follow the step (paused on the last one); true/false = the visitor chose.
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  const [cueOff, setCueOff] = useState(false);

  const paused = userPaused ?? step === STEPS - 1;

  useEffect(() => {
    const read = () => {
      const runway = runwayRef.current;
      if (!runway) return;
      const r = runway.getBoundingClientRect();
      const total = Math.max(1, r.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / total));
      const next = Math.min(STEPS - 1, Math.floor(p * STEPS));
      if (next !== lastStep.current) {
        lastStep.current = next;
        setStep(next);
        setUserPaused(null); // a new step forgets the manual choice
      }
      setCueOff(p > 0.02);
      // The progress bar reads this; setting it directly avoids a re-render per scroll event.
      stageRef.current?.style.setProperty("--p", p.toFixed(3));
    };
    read();
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => {
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, []);

  /** Scroll the page so that step `i` becomes the active one. */
  const goTo = (i: number) => {
    const runway = runwayRef.current;
    if (!runway) return;
    const total = Math.max(1, runway.offsetHeight - window.innerHeight);
    const runwayTop = runway.getBoundingClientRect().top + window.scrollY;
    // The middle of the step's slice, so rounding can never land on its neighbour.
    const top = i <= 0 ? runwayTop : runwayTop + ((i + 0.5) / STEPS) * total;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  };

  /** Past the last step: on to the next section if it exists, else the end of the runway. */
  const keepGoing = () => {
    const next = document.getElementById("proof");
    if (next) next.scrollIntoView({ behavior: "smooth" });
    else goTo(STEPS - 1);
  };

  const dots = (
    <div className="dots" role="group" aria-label="Tour steps">
      {STEP_NAMES.map((name, i) => (
        <button
          key={name}
          type="button"
          className={step === i ? "on" : ""}
          aria-label={`Go to step ${i}: ${name}`}
          aria-current={step === i ? "step" : undefined}
          onClick={() => goTo(i)}
        />
      ))}
    </div>
  );

  return (
    <div
      className="runway"
      ref={runwayRef}
      style={{ height: `calc(${STEPS} * 92svh)` }}
    >
      <div className="stage" ref={stageRef}>
        <ArchitectureDiagram diagram={awsStack} step={step} paused={paused} />

        <div className="cards">
          <div className={`card hero${step === 0 ? " on" : ""}`}>
            <span className="label">{profile.role}</span>
            <h1>
              {hero.headlineStart}
              <em>{hero.headlineEmphasis}</em>
              {hero.headlineEnd}
            </h1>
            <p>{hero.intro}</p>
            <div className="ctas">
              <a className="btn primary" href="#contact">
                {hero.primaryCta}
              </a>
              <a
                className="btn"
                href={profile.cv}
                target="_blank"
                rel="noopener noreferrer"
              >
                {hero.secondaryCta}
              </a>
            </div>
            <button type="button" className="tour" onClick={() => goTo(1)}>
              {tour.start}
              <i aria-hidden="true">↓</i>
            </button>
          </div>

          {story.map((s, i) => {
            const isLast = i === story.length - 1;
            return (
              <div
                key={s.label}
                className={`card${step === i + 1 ? " on" : ""}`}
              >
                <span className="label">{s.label}</span>
                <h2>{s.title}</h2>
                <p>{s.body}</p>
                {s.why && (
                  <p className="why">
                    <b>Why it matters.</b> {s.why}
                  </p>
                )}
                {isLast && (
                  <div className="costrow">
                    <span className={`cost${paused ? " paused" : ""}`}>
                      {paused ? cost.paused : cost.running}
                      <small>
                        {paused ? cost.pausedNote : cost.runningNote}
                      </small>
                    </span>
                    <button
                      className="btn"
                      type="button"
                      aria-pressed={paused}
                      onClick={() => setUserPaused(!paused)}
                    >
                      {paused ? cost.resumeLabel : cost.pauseLabel}
                    </button>
                  </div>
                )}
                <div className="step-nav">
                  <button
                    type="button"
                    className="nav-btn"
                    onClick={() => goTo(i)}
                  >
                    ← {tour.back}
                  </button>
                  {dots}
                  {isLast ? (
                    <button
                      type="button"
                      className="nav-btn primary"
                      onClick={keepGoing}
                    >
                      {tour.keepGoing} ↓
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="nav-btn primary"
                      onClick={() => goTo(i + 2)}
                    >
                      {tour.next}: {story[i + 1].rail} →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <nav className="rail" aria-label="Tour steps">
          {STEP_NAMES.map((name, i) => (
            <button
              key={name}
              type="button"
              className={step === i ? "on" : ""}
              aria-current={step === i ? "step" : undefined}
              onClick={() => goTo(i)}
            >
              {name}
              <i />
            </button>
          ))}
        </nav>

        <button
          type="button"
          className={`scroll-cue${cueOff ? " off" : ""}`}
          onClick={() => goTo(1)}
          aria-label={tour.start}
        >
          {tour.cue}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <div className="progress" aria-hidden="true">
          <i />
        </div>
      </div>
    </div>
  );
}
