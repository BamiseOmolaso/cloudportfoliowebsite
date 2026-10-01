// Headless-Chrome screenshot tool (Chrome DevTools Protocol, no dependencies).
//   node shot.mjs <url> <out.png> [--w=1280] [--h=800] [--dark] [--scroll=Y]
//        [--wait=2500] [--eval="js to run before the shot"] [--keep-cookie]
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
  await send("Emulation.setDeviceMetricsOverride", {
    width: W,
    height: H,
    deviceScaleFactor: 1,
    mobile: W < 600,
  });
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: opt.dark ? "dark" : "light" }],
  });

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
  if (opt.scroll) {
    await evaluate(`window.scrollTo(0, ${+opt.scroll})`);
    await sleep(1800);
  }
  const shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(out, Buffer.from(shot.result.data, "base64"));
  console.log(`saved ${out} (${W}x${H}${opt.dark ? ", dark" : ""})`);
  ws.close();
} finally {
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
