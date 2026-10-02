// Headless-Chrome screenshot tool (Chrome DevTools Protocol, no dependencies).
//   node shot.mjs <url> <out.png> [--w=1280] [--h=800] [--dark] [--scroll=Y] [--to="#css-selector"]
//        [--wait=2500] [--settle=1800] [--eval="js before scrolling"] [--after="js after scrolling"] [--init="js before the page loads"] [--keys="Tab,Enter"] [--reduce] [--keep-cookie]
// WebGL works through SwiftShader (software), so the 3D scene renders.
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [url, out, ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(
  rest.map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);
const W = +opt.w || 1280;
const H = +opt.h || 800;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const port = 9300 + Math.floor(Math.random() * 600);
const profile = mkdtempSync(join(tmpdir(), "shot-"));
const chrome = spawn(
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--hide-scrollbars",
    "--no-first-run",
    "about:blank",
  ],
  { stdio: "ignore" },
);

async function pageSocket() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const p = list.find((t) => t.type === "page");
      if (p) return p.webSocketDebuggerUrl;
    } catch {
      /* chrome still starting */
    }
    await sleep(250);
  }
  throw new Error("Chrome did not start");
}

try {
  const ws = new WebSocket(await pageSocket());
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) {
      pending.get(d.id)(d);
      pending.delete(d.id);
    } else if (d.method) listeners.forEach((f) => f(d));
  };
  const send = (method, params = {}) =>
    new Promise((res) => {
      const myId = ++id;
      pending.set(myId, res);
      ws.send(JSON.stringify({ id: myId, method, params }));
    });
  const evaluate = (expression) =>
    send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  const problems = [];
  listeners.push((d) => {
    if (d.method === "Runtime.exceptionThrown") problems.push("exception: " + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).split("\n")[0]);
    if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") problems.push("console.error: " + d.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 200));
    if (d.method === "Log.entryAdded" && d.params.entry.level === "error") problems.push("log: " + d.params.entry.text.slice(0, 160) + " " + (d.params.entry.url || ""));
  });
  await send("Emulation.setDeviceMetricsOverride", {
    width: W,
    height: H,
    deviceScaleFactor: 1,
    mobile: W < 600,
  });
  await send("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-color-scheme", value: opt.dark ? "dark" : "light" },
      { name: "prefers-reduced-motion", value: opt.reduce ? "reduce" : "no-preference" },
    ],
  });

  if (opt.init) await send("Page.addScriptToEvaluateOnNewDocument", { source: opt.init });
  const loaded = new Promise((res) => listeners.push((d) => d.method === "Page.loadEventFired" && res()));
  await send("Page.navigate", { url });
  await Promise.race([loaded, sleep(30000)]);
  await sleep(+opt.wait || 2500);

  if (!opt["keep-cookie"]) {
    await evaluate(`(() => {
      const el = [...document.querySelectorAll('div')].find(d => d.textContent.trim().startsWith('We use cookies') && /fixed/.test(d.className));
      if (el) el.remove();
    })()`);
  }
  if (opt.eval) {
    const r = await evaluate(opt.eval);
    if (r.result?.result?.value !== undefined) console.log("eval →", JSON.stringify(r.result.result.value));
    if (r.result?.exceptionDetails) console.log("eval error:", r.result.exceptionDetails.text);
  }
  if (opt.to) {
    await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(opt.to)}); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: "instant" }); })()`);
    await sleep(+opt.settle || 1800);
  }
  if (opt.scroll) {
    await evaluate(`window.scrollTo({ top: ${+opt.scroll}, behavior: "instant" })`);
    await sleep(+opt.settle || 1800);
  }
  if (opt.keys) {
    // Real key presses, e.g. --keys="Tab,Tab,Shift+Tab,Enter,Escape"
    const table = { Tab: [9, "Tab"], Enter: [13, "Enter"], Escape: [27, "Escape"], ArrowDown: [40, "ArrowDown"], ArrowUp: [38, "ArrowUp"], " ": [32, "Space"] };
    for (const k of String(opt.keys).split(",")) {
      const shift = k.startsWith("Shift+");
      const name = shift ? k.slice(6) : k;
      const [vk, code] = table[name] || [0, name];
      const base = { key: name, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: shift ? 8 : 0 };
      // Enter and Space activate buttons only when the keydown carries text.
      const text = name === "Enter" ? String.fromCharCode(13) : name === " " ? " " : undefined;
      await send("Input.dispatchKeyEvent", text ? { type: "keyDown", text, unmodifiedText: text, ...base } : { type: "rawKeyDown", ...base });
      await send("Input.dispatchKeyEvent", { type: "keyUp", ...base });
      await sleep(+opt.keywait || 250);
    }
    await sleep(+opt.settle || 1500);
  }
  if (opt.after) {
    const r = await evaluate(opt.after);
    if (r.result?.result?.value !== undefined) console.log("after →", JSON.stringify(r.result.result.value));
    if (r.result?.exceptionDetails) console.log("after error:", r.result.exceptionDetails.text);
  }
  const shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(out, Buffer.from(shot.result.data, "base64"));
  console.log(problems.length ? `console problems (${problems.length}):\n  ` + [...new Set(problems)].join("\n  ") : "no console errors");
  console.log(`saved ${out} (${W}x${H}${opt.dark ? ", dark" : ""})`);
  ws.close();
} finally {
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
