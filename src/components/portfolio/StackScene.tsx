"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/** What the parent tells the scene. Read every frame, so changing it never rebuilds the scene. */
export interface SceneState {
  /** 0 = hero, 1-5 = the story steps (edge, app, data, security, cost). */
  step: number;
  /** Compute resources (load balancer, tasks, database) are shown paused. */
  paused: boolean;
}

type Tier = "edge" | "app" | "data";
type Focus = Tier | "vpc" | "pause" | null;
type Obj = { g: THREE.Object3D };

interface SceneNode extends Obj {
  name: string;
  tier: Tier;
  fill: THREE.MeshBasicMaterial;
  edges: THREE.LineBasicMaterial;
  height: number;
  /** Costs money while running, so it turns amber when paused. */
  compute: boolean;
  /** Label suffix shown while paused, e.g. "scaled to 0". */
  pausedText: string;
  tag: HTMLDivElement;
}

interface Target {
  az: number;
  el: number;
  dist: number;
  ty: number;
  spread: number;
  focus: Focus;
}

// One camera pose per step: hero, edge, app, data, security, cost.
const TARGETS: Target[] = [
  { az: 0.65, el: 0.3, dist: 15.5, ty: 0, spread: 1.15, focus: null },
  { az: 0.4, el: 0.22, dist: 13, ty: 0.85, spread: 1.9, focus: "edge" },
  { az: 0.15, el: 0.26, dist: 13, ty: 0, spread: 1.9, focus: "app" },
  { az: -0.35, el: 0.28, dist: 13, ty: -0.85, spread: 1.9, focus: "data" },
  { az: 0.95, el: 0.5, dist: 17, ty: 0, spread: 1.5, focus: "vpc" },
  { az: 0.0, el: 0.62, dist: 15.5, ty: 0, spread: 0.85, focus: "pause" },
];

const TIERS: Tier[] = ["edge", "app", "data"];
const COLOR_KEYS = [
  "accent",
  "accent-2",
  "line",
  "ink-2",
  "warn",
  "bg",
] as const;

function paint(
  mat: { color: THREE.Color; opacity: number },
  color: THREE.Color,
  opacity: number,
  rate: number,
) {
  mat.color.lerp(color, rate);
  mat.opacity += (opacity - mat.opacity) * rate;
}

function level(tier: Tier, focus: Focus) {
  if (focus === null) return 0.6;
  if (focus === "vpc") return 0.42;
  if (focus === "pause") return 0.7;
  return tier === focus ? 1 : 0.2;
}

/**
 * The exploded 3D view of the AWS stack: three tiers, the services on each,
 * the links between them, and packets following one request. Camera, focus
 * and the amber "paused" state follow `stateRef`.
 */
export default function StackScene({
  stateRef,
  onUnsupported,
}: {
  stateRef: React.MutableRefObject<SceneState>;
  /** Called once if WebGL is unavailable, so the parent can hide the labels. */
  onUnsupported?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const unsupportedRef = useRef(onUnsupported);
  unsupportedRef.current = onUnsupported;

  useEffect(() => {
    const canvas = canvasRef.current;
    const tagsEl = tagsRef.current;
    if (!canvas || !tagsEl) return;

    const root = canvas.closest<HTMLElement>(".pf") ?? document.documentElement;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // The design was drawn with three r128, which blends in plain sRGB. Match
    // that look instead of the newer linear-light default.
    THREE.ColorManagement.enabled = false;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
      });
    } catch {
      unsupportedRef.current?.();
      return;
    }
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    const world = new THREE.Group();
    scene.add(world);

    /* ---- colours come from the CSS tokens, so both themes just work ---- */
    const C = {} as Record<(typeof COLOR_KEYS)[number], THREE.Color>;
    COLOR_KEYS.forEach((k) => (C[k] = new THREE.Color("#888888")));
    const readColors = () => {
      const cs = getComputedStyle(root);
      COLOR_KEYS.forEach((k) =>
        C[k].set(cs.getPropertyValue(`--${k}`).trim() || "#888888"),
      );
    };
    readColors();
    const themeObserver = new MutationObserver(readColors);
    themeObserver.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    const schemeQuery = window.matchMedia("(prefers-color-scheme: light)");
    schemeQuery.addEventListener("change", readColors);

    /* ---- tiers ---- */
    const layers = {} as Record<
      Tier,
      {
        g: THREE.Group;
        fill: THREE.MeshBasicMaterial;
        edges: THREE.LineBasicMaterial;
      }
    >;
    const plateGeo = new THREE.BoxGeometry(7.4, 0.08, 4.4);
    TIERS.forEach((t) => {
      const g = new THREE.Group();
      world.add(g);
      const fill = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.06,
        depthWrite: false,
      });
      const edges = new THREE.LineBasicMaterial({
        transparent: true,
        color: C.line.clone(),
        opacity: 0.3,
      });
      g.add(new THREE.Mesh(plateGeo, fill));
      g.add(new THREE.LineSegments(new THREE.EdgesGeometry(plateGeo), edges));
      layers[t] = { g, fill, edges };
    });

    /* ---- services ---- */
    const nodes: SceneNode[] = [];
    const addNode = (
      name: string,
      tier: Tier,
      x: number,
      z: number,
      w: number,
      h: number,
      d: number,
      opts: { compute?: boolean; pausedText?: string } = {},
    ): SceneNode => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const fill = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
      });
      const edges = new THREE.LineBasicMaterial({
        transparent: true,
        color: C.line.clone(),
        opacity: 0.3,
      });
      const g = new THREE.Group();
      g.add(new THREE.Mesh(geo, fill));
      g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edges));
      g.position.set(x, 0.04 + h / 2, z);
      layers[tier].g.add(g);
      const tag = document.createElement("div");
      tag.className = "tag";
      tag.textContent = name;
      tagsEl.appendChild(tag);
      const node: SceneNode = {
        name,
        tier,
        g,
        fill,
        edges,
        height: h,
        compute: !!opts.compute,
        pausedText: opts.pausedText ?? "",
        tag,
      };
      nodes.push(node);
      return node;
    };
    const r53 = addNode("Route 53", "edge", -2.4, 0.2, 0.9, 0.4, 0.9);
    addNode("ACM", "edge", -0.4, -1.2, 0.7, 0.3, 0.7);
    const alb = addNode("ALB", "edge", 1.9, 0.1, 1.5, 0.5, 1.5, {
      compute: true,
      pausedText: "removed",
    });
    const ecr = addNode("ECR", "app", -2.5, -1.2, 0.8, 0.3, 0.8);
    const tA = addNode("ECS Fargate", "app", 0.4, -0.9, 1.3, 0.55, 1.1, {
      compute: true,
      pausedText: "scaled to 0",
    });
    const tB = addNode("task", "app", 0.4, 1.0, 1.3, 0.55, 1.1, {
      compute: true,
      pausedText: "scaled to 0",
    });
    const rds = addNode("RDS PostgreSQL", "data", -0.9, 0, 1.5, 0.7, 1.5, {
      compute: true,
      pausedText: "stopped",
    });
    const redis = addNode("Redis", "data", 1.9, -1.1, 0.9, 0.4, 0.9);
    const sec = addNode("Secrets Manager", "data", 1.9, 1.0, 0.9, 0.4, 0.9);
    tB.tag.style.display = "none"; // second task is drawn but not labelled

    /* ---- the browser, as a small octahedron ---- */
    const clientGeo = new THREE.OctahedronGeometry(0.42);
    const clientFill = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    const clientEdges = new THREE.LineBasicMaterial({ transparent: true });
    const client: Obj = { g: new THREE.Group() };
    client.g.add(new THREE.Mesh(clientGeo, clientFill));
    client.g.add(
      new THREE.LineSegments(new THREE.EdgesGeometry(clientGeo), clientEdges),
    );
    world.add(client.g);

    /* ---- the VPC boundary ---- */
    const cageMat = new THREE.LineBasicMaterial({ transparent: true });
    const cageGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
    const cage = new THREE.LineSegments(cageGeo, cageMat);
    world.add(cage);
    const vpcTag = document.createElement("div");
    vpcTag.className = "tag";
    vpcTag.textContent = "VPC · private network";
    tagsEl.appendChild(vpcTag);

    /* ---- links between services ---- */
    const pairs: [Obj, Obj][] = [
      [client, r53],
      [r53, alb],
      [alb, tA],
      [alb, tB],
      [tA, rds],
      [tB, rds],
      [tA, redis],
      [tA, sec],
      [ecr, tA],
    ];
    const linePos = new Float32Array(pairs.length * 6);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
    const linkMat = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.4,
    });
    const links = new THREE.LineSegments(lineGeo, linkMat);
    links.frustumCulled = false;
    world.add(links);

    /* ---- packets: browser → route 53 → ALB → task → database and back ---- */
    const packetGeo = new THREE.SphereGeometry(0.075, 12, 12);
    const packets = Array.from({ length: 7 }, (_, k) => {
      // Fully visible from the first frame (like the original), unless the
      // visitor prefers reduced motion — then they never appear.
      const mat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: reduce ? 0 : 1,
      });
      const mesh = new THREE.Mesh(packetGeo, mat);
      world.add(mesh);
      return { mesh, mat, offset: k / 7, route: k % 2 };
    });
    const routeObjs = (task: Obj) => [
      client,
      r53,
      alb,
      task,
      rds,
      task,
      alb,
      client,
    ];
    const routes = [tA, tB].map((task) => ({
      objs: routeObjs(task),
      pts: Array.from({ length: 8 }, () => new THREE.Vector3()),
      cum: new Array<number>(8).fill(0),
      total: 0,
    }));

    const tmp = new THREE.Vector3();
    const tmp2 = new THREE.Vector3();
    const tmpCol = new THREE.Color();
    const worldPos = (o: Obj, out: THREE.Vector3) => o.g.getWorldPosition(out);

    const cam = {
      az: 0.65,
      el: 0.3,
      dist: 15,
      ty: 0,
      spread: 1.15,
      ox: 0,
      oy: 0,
    };
    const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
    const stage = canvas.parentElement;
    const onPointerMove = (e: PointerEvent) => {
      const r = (stage ?? canvas).getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    stage?.addEventListener("pointermove", onPointerMove);

    let W = 1;
    let H = 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    let visible = true;
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0 },
    );
    visibilityObserver.observe(canvas);

    let raf = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;

      const t = now / 1000;
      const { step, paused } = stateRef.current;
      const target = TARGETS[Math.min(step, TARGETS.length - 1)];
      const focus = target.focus;
      const wide = W / H > 1.1 && window.innerWidth >= 928;
      const rate = reduce ? 1 : 0.07;
      const fit = W / H < 1.1 ? Math.min(2.8, 1.15 / (W / H)) : 1;

      cam.az += (target.az - cam.az) * rate;
      cam.el += (target.el - cam.el) * rate;
      cam.dist += (target.dist * fit - cam.dist) * rate;
      cam.ty += (target.ty - cam.ty) * rate;
      cam.spread += (target.spread - cam.spread) * rate;
      // On wide screens the scene sits right of the text; on narrow ones, above it.
      const toX = wide ? (step === 0 ? 3.9 : 2.8) : 0;
      const toY = wide ? 0 : 1.25;
      cam.ox += (toX - cam.ox) * rate;
      cam.oy += (toY - cam.oy) * rate;
      mouse.sx += (mouse.x - mouse.sx) * 0.05;
      mouse.sy += (mouse.y - mouse.sy) * 0.05;

      const drift = reduce ? 0 : Math.sin(t * 0.25) * 0.05;
      const az = cam.az + drift + (reduce ? 0 : mouse.sx * 0.12);
      const el = cam.el + (reduce ? 0 : mouse.sy * -0.05);
      world.position.set(cam.ox, cam.oy, 0);
      camera.position.set(
        cam.dist * Math.cos(el) * Math.sin(az),
        cam.dist * Math.sin(el) + cam.ty,
        cam.dist * Math.cos(el) * Math.cos(az),
      );
      camera.lookAt(0, cam.ty, 0);

      layers.edge.g.position.y = cam.spread;
      layers.app.g.position.y = 0;
      layers.data.g.position.y = -cam.spread;
      client.g.position.set(
        -5.4,
        cam.spread + 0.9 + Math.sin(t * 1.2) * 0.06,
        0.3,
      );
      client.g.rotation.y = t * 0.6;
      const cageH = 2 * cam.spread + 1.9;
      cage.scale.set(8.4, cageH, 5.4);
      cage.position.y = 0.2;
      world.updateMatrixWorld(true);

      /* tiers and services fade towards the focused tier */
      TIERS.forEach((name) => {
        const L = layers[name];
        const lv = level(name, focus);
        paint(
          L.edges,
          tmpCol.copy(C.line).lerp(C.accent, lv),
          0.3 + 0.7 * lv,
          rate,
        );
        paint(L.fill, C.accent, 0.02 + 0.08 * lv, rate);
      });
      nodes.forEach((n) => {
        const lv = level(n.tier, focus);
        const amber = paused && n.compute;
        paint(
          n.edges,
          amber ? C.warn : tmpCol.copy(C.line).lerp(C.accent, lv),
          amber ? 0.9 : 0.3 + 0.7 * lv,
          rate,
        );
        paint(
          n.fill,
          amber ? C.warn : C.accent,
          amber ? 0.1 : 0.04 + 0.3 * lv,
          rate,
        );
      });
      paint(clientEdges, C["accent-2"], 0.9, rate);
      paint(clientFill, C["accent-2"], 0.25, rate);
      paint(
        cageMat,
        tmpCol.copy(C.line).lerp(C.accent, focus === "vpc" ? 1 : 0.1),
        focus === "vpc" ? 1 : 0.28,
        rate,
      );
      linkMat.color.copy(C.accent);
      linkMat.opacity +=
        ((focus === "vpc" ? 0.2 : paused ? 0.15 : 0.45) - linkMat.opacity) *
        rate;

      pairs.forEach(([a, b], i) => {
        worldPos(a, tmp).sub(world.position);
        worldPos(b, tmp2).sub(world.position);
        linePos.set([tmp.x, tmp.y, tmp.z, tmp2.x, tmp2.y, tmp2.z], i * 6);
      });
      lineGeo.attributes.position.needsUpdate = true;

      /* packets pause when the environment is paused */
      routes.forEach((route) => {
        route.total = 0;
        route.objs.forEach((o, i) => {
          worldPos(o, route.pts[i]);
          if (i) route.total += route.pts[i].distanceTo(route.pts[i - 1]);
          route.cum[i] = route.total;
        });
      });
      packets.forEach((pk) => {
        const want = paused || reduce ? 0 : 1;
        pk.mat.opacity += (want - pk.mat.opacity) * 0.08;
        pk.mat.color.copy(C["accent-2"]);
        pk.mesh.visible = pk.mat.opacity > 0.02;
        if (!pk.mesh.visible) return;
        const route = routes[pk.route];
        const u = ((t * 0.07 + pk.offset) % 1) * route.total;
        let i = 1;
        while (i < route.cum.length - 1 && u > route.cum[i]) i++;
        const span = Math.max(0.0001, route.cum[i] - route.cum[i - 1]);
        pk.mesh.position
          .lerpVectors(
            route.pts[i - 1],
            route.pts[i],
            (u - route.cum[i - 1]) / span,
          )
          .sub(world.position);
      });

      renderer.render(scene, camera);

      /* HTML labels follow the services they name */
      const showLabel = (n: SceneNode) => {
        if (focus === null || focus === "vpc") return false;
        if (focus === "pause")
          return (
            (n.compute || n.name === "Secrets Manager") && n.name !== "task"
          );
        return n.tier === focus && n.name !== "task";
      };
      nodes.forEach((n) => {
        if (n.name === "task") return;
        worldPos(n, tmp);
        tmp.y += n.height / 2 + 0.28;
        tmp.project(camera);
        const x = (tmp.x * 0.5 + 0.5) * W;
        const y = (-tmp.y * 0.5 + 0.5) * H;
        const pausedLabel = paused && !!n.pausedText && focus === "pause";
        const text = pausedLabel ? `${n.name} · ${n.pausedText}` : n.name;
        if (n.tag.textContent !== text) n.tag.textContent = text;
        n.tag.classList.toggle("on", showLabel(n));
        n.tag.classList.toggle("paused", pausedLabel);
        n.tag.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-100%)`;
      });
      tmp.set(-4.2, cage.position.y + cageH / 2, 2.7).add(world.position);
      tmp.project(camera);
      vpcTag.classList.toggle("on", focus === "vpc");
      vpcTag.style.transform = `translate(${Math.round((tmp.x * 0.5 + 0.5) * W)}px,${Math.round((-tmp.y * 0.5 + 0.5) * H)}px) translate(-50%,-100%)`;
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      themeObserver.disconnect();
      schemeQuery.removeEventListener("change", readColors);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      stage?.removeEventListener("pointermove", onPointerMove);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose?.();
      });
      renderer.dispose();
      tagsEl.replaceChildren();
    };
  }, [stateRef]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="gl"
        role="img"
        aria-label="3D exploded view of the AWS architecture behind this site"
      />
      <div ref={tagsRef} className="tags" aria-hidden="true" />
    </>
  );
}
