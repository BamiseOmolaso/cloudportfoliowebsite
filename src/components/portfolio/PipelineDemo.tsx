"use client";

import { useEffect, useRef, useState } from "react";
import { pipeline } from "@/content/portfolio";

type Status = "queued" | "run" | "pass" | "fail" | "skip";
type Note = "last" | "running" | "passed" | "failed";

const N = pipeline.stages.length;

/**
 * The commit-to-production pipeline as something you can run. Tick
 * "Break a test" and the run stops at the tests: nothing is built, nothing
 * reaches AWS, and production keeps serving the last good version.
 * Security scans are shown as "reported" because in the real pipeline they
 * report rather than block.
 */
export default function PipelineDemo() {
  const [status, setStatus] = useState<Status[]>(() =>
    Array.from({ length: N }, () => "pass"),
  );
  const [breakTest, setBreakTest] = useState(false);
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState<Note>("last");
  const timers = useRef<number[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  const autoRan = useRef(false);

  const run = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const step = reduce ? 0 : 950;
    const breakNow = breakTest;

    setStatus(Array.from({ length: N }, () => "queued"));
    setNote("running");
    setRunning(true);

    const go = (i: number) => {
      if (i >= N) {
        setRunning(false);
        setNote("passed");
        return;
      }
      setStatus((prev) => prev.map((s, j) => (j === i ? "run" : s)));
      timers.current.push(
        window.setTimeout(() => {
          if (breakNow && i === pipeline.failAt) {
            setStatus((prev) =>
              prev.map((s, j) => (j === i ? "fail" : j > i ? "skip" : s)),
            );
            setRunning(false);
            setNote("failed");
            return;
          }
          setStatus((prev) => prev.map((s, j) => (j === i ? "pass" : s)));
          go(i + 1);
        }, step),
      );
    };
    go(0);
  };

  // Run once, the first time the stages scroll into view.
  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => {
    const box = boxRef.current;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!box || reduce || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !autoRan.current) {
          autoRan.current = true;
          io.disconnect();
          runRef.current();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(box);
    return () => {
      io.disconnect();
      timers.current.forEach(clearTimeout);
    };
  }, []);

  const label = (s: Status, reportOnly?: boolean) => {
    switch (s) {
      case "queued":
        return "queued";
      case "run":
        return "running";
      case "pass":
        return reportOnly ? "reported" : "passed";
      case "fail":
        return "failed";
      case "skip":
        return "skipped";
    }
  };

  return (
    <section className="block rise" id="pipeline">
      <div className="sec-head">
        <span className="label">{pipeline.label}</span>
        <h2>{pipeline.title}</h2>
        <p>{pipeline.intro}</p>
      </div>
      <div className="pipe">
        <div className="pipe-ctl">
          <button
            className="btn primary"
            type="button"
            onClick={run}
            disabled={running}
          >
            Run pipeline
          </button>
          <label className="tog" htmlFor="pf-break">
            <input
              id="pf-break"
              type="checkbox"
              checked={breakTest}
              onChange={(e) => setBreakTest(e.target.checked)}
            />{" "}
            Break a test
          </label>
        </div>
        <div className="stages" ref={boxRef}>
          {pipeline.stages.map((stage, i) => (
            <div
              className={`st ${status[i] === "queued" ? "" : status[i]}`}
              key={stage.title}
            >
              <span className="n">{String(i + 1).padStart(2, "0")}</span>
              <strong>{stage.title}</strong>
              <span className="s">{label(status[i], stage.reportOnly)}</span>
              <i />
            </div>
          ))}
        </div>
        <p className="pipe-note" aria-live="polite">
          {note === "last" && (
            <>
              <b>Last run passed.</b> {pipeline.notes.idle}
            </>
          )}
          {note === "running" && (
            <>
              <b>Running.</b> {pipeline.notes.running}
            </>
          )}
          {note === "passed" && (
            <>
              <b>Run passed.</b> {pipeline.notes.idle}
            </>
          )}
          {note === "failed" && (
            <>
              <b>Pipeline stopped at the tests.</b> {pipeline.notes.failed}
            </>
          )}
        </p>
        <p className="pipe-foot">{pipeline.footnote}</p>
      </div>
    </section>
  );
}
