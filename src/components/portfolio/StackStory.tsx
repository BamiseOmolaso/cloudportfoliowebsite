"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { cost, hero, profile, story } from "@/content/portfolio";
import type { SceneState } from "./StackScene";

// three.js is heavy and needs the browser, so it loads only on the client.
const StackScene = dynamic(() => import("./StackScene"), { ssr: false });

/** The hero plus one step per story card. */
const STEPS = story.length + 1;

/**
 * The scroll story: a tall "runway" with a sticky stage. As the visitor
 * scrolls, the active step changes, the 3D scene moves to that step and the
 * matching card fades in.
 */
export default function StackStory() {
  const runwayRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<SceneState>({ step: 0, paused: false });
  const lastStep = useRef(0);

  const [step, setStep] = useState(0);
  // null = follow the step (paused on the last one); true/false = the visitor chose.
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  const [hintOff, setHintOff] = useState(false);
  const [noGl, setNoGl] = useState(false);

  const paused = userPaused ?? step === STEPS - 1;

  useEffect(() => {
    stateRef.current = { step, paused };
  }, [step, paused]);

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
      setHintOff(p > 0.02);
    };
    read();
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => {
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, []);

  return (
    <div
      className="runway"
      ref={runwayRef}
      style={{ height: `calc(${STEPS} * 92svh)` }}
    >
      <div className={`stage${noGl ? " no-gl" : ""}`}>
        <StackScene stateRef={stateRef} onUnsupported={() => setNoGl(true)} />

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
          </div>

          {story.map((s, i) => (
            <div key={s.label} className={`card${step === i + 1 ? " on" : ""}`}>
              <span className="label">{s.label}</span>
              <h2>{s.title}</h2>
              <p>{s.body}</p>
              {s.why && (
                <p className="why">
                  <b>Why it matters.</b> {s.why}
                </p>
              )}
              {i === story.length - 1 && (
                <div className="costrow">
                  <span className={`cost${paused ? " paused" : ""}`}>
                    {paused ? cost.paused : cost.running}
                    <small>{paused ? cost.pausedNote : cost.runningNote}</small>
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
            </div>
          ))}
        </div>

        <div className="rail" aria-hidden="true">
          <span className={step === 0 ? "on" : ""}>
            Intro
            <i />
          </span>
          {story.map((s, i) => (
            <span key={s.rail} className={step === i + 1 ? "on" : ""}>
              {s.rail}
              <i />
            </span>
          ))}
        </div>
        <div className={`hint${hintOff ? " off" : ""}`}>
          Scroll ↓ · move the cursor to tilt the scene
        </div>
      </div>
    </div>
  );
}
