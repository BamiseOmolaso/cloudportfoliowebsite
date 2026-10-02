"use client";

import { useEffect, useId, useRef, useState } from "react";
import type {
  Diagram,
  DiagramGroup,
  DiagramNode,
  IconName,
  Tone,
} from "@/content/architecture";

const TILE = 52;
const HALF = TILE / 2;
const PACKET_SECONDS = 8;
const PACKETS_PER_ROUTE = 4;

// Tile colours follow AWS's icon categories, so the diagram reads the way
// engineers expect: networking purple, compute orange, database magenta,
// security red. The glyphs are simple line icons drawn for this page, not
// the official AWS icon set.
const TONES: Record<Tone, string> = {
  network: "#8c4fff",
  compute: "#ed7100",
  database: "#c925d1",
  security: "#dd344c",
  storage: "#7aa116",
  neutral: "#5b6577",
  dark: "#24292f",
};

// 24 x 24 line icons.
const ICONS: Record<IconName, string> = {
  browser: "M3 5h18v14H3z M3 9.5h18 M6.5 7.2h.01 M9.2 7.2h.01",
  globe:
    "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c2.6 2.4 3.9 5.4 3.9 9s-1.3 6.6-3.9 9c-2.6-2.4-3.9-5.4-3.9-9S9.4 5.4 12 3z",
  gateway: "M4 20V9.5L12 4l8 5.5V20 M9 20v-6.5h6V20 M3 20h18",
  balancer:
    "M3.5 12H10 M10 12l5.8-6 M10 12h5.8 M10 12l5.8 6 M15.8 6a2.2 2.2 0 1 0 4.4 0 2.2 2.2 0 1 0-4.4 0 M15.8 12a2.2 2.2 0 1 0 4.4 0 2.2 2.2 0 1 0-4.4 0 M15.8 18a2.2 2.2 0 1 0 4.4 0 2.2 2.2 0 1 0-4.4 0",
  certificate:
    "M5 3.5h14v11H5z M8.5 7.5h7 M8.5 10.5h4 M9 14.5l-1.5 6 3.5-2 3.5 2-1.5-6",
  container:
    "M12 3l8 4.5v9L12 21l-8-4.5v-9z M12 12l8-4.5 M12 12v9 M12 12L4 7.5",
  registry: "M4 7l8-4 8 4-8 4z M4 12l8 4 8-4 M4 17l8 4 8-4",
  database:
    "M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3z M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6 M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  key: "M3.5 11a4.5 4.5 0 1 0 9 0 4.5 4.5 0 1 0-9 0 M11.2 14.2L20 21 M16.2 17.4l2.3-2.3 M18.8 19.4l1.9-1.9",
  bolt: "M13 3L5 13.5h6L10 21l9-11h-6.5z",
  branch:
    "M7 7.2v9.6 M17 11.2c0 3-3.5 3.8-10 3.8 M4.8 5a2.2 2.2 0 1 0 4.4 0 2.2 2.2 0 1 0-4.4 0 M4.8 19a2.2 2.2 0 1 0 4.4 0 2.2 2.2 0 1 0-4.4 0 M14.8 9a2.2 2.2 0 1 0 4.4 0 2.2 2.2 0 1 0-4.4 0",
  shield:
    "M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z M9 12l2.2 2.2L15.5 10",
};

function Group({
  g,
  step,
  dim,
}: {
  g: DiagramGroup;
  step: number;
  dim: boolean;
}) {
  const hidden =
    (g.showIn && !g.showIn.includes(step)) || g.hideIn?.includes(step);
  const cls = `dg-group ${g.kind}${dim ? " dim" : ""}${hidden ? " hidden" : ""}`;
  return (
    <g className={cls}>
      <rect
        className="box"
        x={g.x}
        y={g.y}
        width={g.w}
        height={g.h}
        rx={g.kind === "cloud" ? 14 : 10}
      />
      {g.kind === "cloud" ? (
        // Top-right, so it never sits behind the internet gateway.
        <text className="gl-end" x={g.x + g.w - 12} y={g.y + 22}>
          <tspan className="gl-title">{g.label}</tspan>
          {g.sub && (
            <tspan className="gl-sub" dx={6}>
              {g.sub}
            </tspan>
          )}
        </text>
      ) : g.labelAt ? (
        <text
          className="gl-title"
          x={g.labelAt.x}
          y={g.labelAt.y}
          style={{ textAnchor: g.labelAt.anchor ?? "start" }}
        >
          {g.label}
        </text>
      ) : (
        <>
          <text className="gl-title" x={g.x + 10} y={g.y + 17}>
            {g.label}
          </text>
          {g.sub && (
            <text className="gl-sub" x={g.x + 10} y={g.y + 31}>
              {g.sub}
            </text>
          )}
        </>
      )}
    </g>
  );
}

function Node({
  n,
  dim,
  hot,
  paused,
}: {
  n: DiagramNode;
  dim: boolean;
  hot: boolean;
  paused: boolean;
}) {
  const isPaused = paused && !!n.compute;
  const cls = `dg-node${dim ? " dim" : ""}${hot ? " hot" : ""}${isPaused ? " paused" : ""}`;
  return (
    <g className={cls} transform={`translate(${n.x - HALF},${n.y - HALF})`}>
      <rect
        className="ring"
        x={-4}
        y={-4}
        width={TILE + 8}
        height={TILE + 8}
        rx={14}
      />
      <rect
        className="tile"
        width={TILE}
        height={TILE}
        rx={11}
        fill={TONES[n.tone]}
      />
      {n.external && (
        <rect
          className="ext"
          x={-2}
          y={-2}
          width={TILE + 4}
          height={TILE + 4}
          rx={13}
        />
      )}
      <path
        className="glyph"
        d={ICONS[n.icon]}
        transform={`translate(${HALF - 14.4},${HALF - 14.4}) scale(1.2)`}
      />
      <text className="dg-label" x={HALF} y={TILE + 17}>
        {n.label}
      </text>
      {n.sub && (
        <text className="dg-sub" x={HALF} y={TILE + 31}>
          {n.sub}
        </text>
      )}
      {isPaused && n.pausedText && (
        <text className="dg-state" x={HALF} y={TILE + (n.sub ? 45 : 31)}>
          {n.pausedText}
        </text>
      )}
    </g>
  );
}

/**
 * Renders a `Diagram` as an AWS-style architecture diagram. `step` chooses
 * which part to zoom to and which elements stay bright; `paused` turns the
 * compute services amber and stops the request packets.
 *
 * It renders on the server too (the whole diagram, no zoom), so it works
 * without JavaScript or WebGL.
 */
export default function ArchitectureDiagram({
  diagram,
  step,
  paused,
}: {
  diagram: Diagram;
  step: number;
  paused: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [reduce, setReduce] = useState(false);
  const uid = useId().replace(/:/g, "");

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => {
      const r = box.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setSize({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    // Let the first layout settle before enabling the zoom transition, so the
    // diagram doesn't animate in from its un-zoomed pose.
    const raf = requestAnimationFrame(() => setReady(true));
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(q.matches);
    const onChange = () => setReduce(q.matches);
    q.addEventListener("change", onChange);
    return () => q.removeEventListener("change", onChange);
  }, []);

  const current = diagram.steps[Math.min(step, diagram.steps.length - 1)];
  const focus = current.focus ? new Set(current.focus) : null;
  const dimmed = (id: string) => !!focus && !focus.has(id);
  const hot = (id: string) => !!focus && focus.has(id);

  // The camera: scale and move the whole drawing so `region` fills the box.
  let k = 1;
  let transform: string | undefined;
  if (size) {
    const [rx, ry, rw, rh] = current.region;
    // Fit the region, but don't zoom in so far that it feels cramped.
    k = Math.min(Math.min(size.w / rw, size.h / rh) * 0.94, 1.3);
    const tx = size.w / 2 - k * (rx + rw / 2);
    const ty = size.h / 2 - k * (ry + rh / 2);
    transform = `translate(${tx}px, ${ty}px) scale(${k})`;
  }
  // On small screens the full view is tiny, so drop the small print.
  const scale = k < 0.5 ? "tiny" : k < 0.72 ? "small" : "normal";

  const arrow = `${uid}-arrow`;
  const arrowHot = `${uid}-arrow-hot`;
  const showPackets = !paused && !reduce;

  return (
    <div className="diagram" ref={boxRef}>
      <svg
        className={`dg dg-${scale}`}
        viewBox={
          size
            ? `0 0 ${size.w} ${size.h}`
            : `0 0 ${diagram.width} ${diagram.height}`
        }
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={diagram.summary}
      >
        <defs>
          <marker
            id={arrow}
            viewBox="0 0 10 10"
            refX="8.5"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M0,0 L10,5 L0,10 z" className="arrow" />
          </marker>
          <marker
            id={arrowHot}
            viewBox="0 0 10 10"
            refX="8.5"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M0,0 L10,5 L0,10 z" className="arrow hot" />
          </marker>
        </defs>

        <g
          className="dg-camera"
          style={{
            transform,
            transition: ready
              ? "transform 0.95s cubic-bezier(0.22, 0.8, 0.24, 1)"
              : "none",
          }}
        >
          {diagram.groups.map((g) => (
            <Group key={g.id} g={g} step={step} dim={dimmed(g.id)} />
          ))}

          {diagram.edges.map((e) => {
            const isHot = hot(e.id);
            const cls = `dg-edge${e.dashed ? " dashed" : ""}${isHot ? " hot" : ""}${dimmed(e.id) ? " dim" : ""}${paused && e.compute ? " paused" : ""}`;
            return (
              <path
                key={e.id}
                className={cls}
                d={e.d}
                markerEnd={`url(#${isHot ? arrowHot : arrow})`}
              />
            );
          })}

          {showPackets &&
            diagram.routes.flatMap((route, r) =>
              Array.from({ length: PACKETS_PER_ROUTE }, (_, i) => (
                <circle
                  key={`${r}-${i}`}
                  className="dg-packet"
                  r={4.5}
                  cx={0}
                  cy={0}
                >
                  <animateMotion
                    dur={`${PACKET_SECONDS}s`}
                    begin={`-${((i + r / 2) * PACKET_SECONDS) / PACKETS_PER_ROUTE}s`}
                    repeatCount="indefinite"
                    path={route}
                  />
                </circle>
              )),
            )}

          {diagram.labels.map((l, i) => (
            <text
              key={i}
              className={`dg-port${l.showIn.includes(step) ? " on" : ""}`}
              x={l.x}
              y={l.y}
            >
              {l.text}
            </text>
          ))}

          {diagram.nodes.map((n) => (
            <Node
              key={n.id}
              n={n}
              dim={dimmed(n.id)}
              hot={hot(n.id)}
              paused={paused}
            />
          ))}

          {/* Numbered tour stops: they hint that there's a sequence to follow. */}
          {diagram.markers.map((m) => (
            <g
              key={m.step}
              className={`dg-badge${m.step === step ? " on" : ""}`}
              transform={`translate(${m.x},${m.y})`}
            >
              <circle className="pulse" r={11} />
              <circle className="dot" r={11} />
              <text y={4.2}>{m.step}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
