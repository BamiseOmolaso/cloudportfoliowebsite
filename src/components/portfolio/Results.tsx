"use client";

import { useEffect, useRef, useState } from "react";
import { results, stats } from "@/content/portfolio";

/**
 * The headline numbers. They render at their final value (so the page is
 * right without JavaScript and for reduced-motion visitors) and count up
 * once, the first time they scroll into view.
 */
export default function Results() {
  const [shown, setShown] = useState<string[]>(() => stats.map((s) => s.value));
  const cells = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce || !("IntersectionObserver" in window)) return;

    const frames: number[] = [];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          const i = Number((e.target as HTMLElement).dataset.i);
          const stat = stats[i];
          if (stat.to === undefined) return;
          const to = stat.to;
          const start = performance.now();
          const tick = (now: number) => {
            const k = Math.min(1, (now - start) / 1100);
            const v = Math.round(to * (1 - Math.pow(1 - k, 3)));
            setShown((prev) => {
              const next = [...prev];
              next[i] = `${stat.pre ?? ""}${v}${stat.suf ?? ""}`;
              return next;
            });
            if (k < 1) frames.push(requestAnimationFrame(tick));
          };
          frames.push(requestAnimationFrame(tick));
        });
      },
      { threshold: 0.6 },
    );
    cells.current.forEach((el) => el && io.observe(el));
    return () => {
      io.disconnect();
      frames.forEach(cancelAnimationFrame);
    };
  }, []);

  return (
    <section className="block rise" id="proof">
      <div className="sec-head">
        <h2>{results.title}</h2>
      </div>
      <div className="stats">
        {stats.map((s, i) => (
          <div className="stat" key={s.label}>
            <b
              data-i={i}
              ref={(el) => {
                cells.current[i] = el;
              }}
            >
              {shown[i]}
            </b>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
