// Medições do 3D (issue #53), contra o site compilado (`npm run build` e
// `npx next start -p 3100`): chamadas de desenho do prédio, fps ao caminhar
// e memória ao trocar o 3D 10 vezes, num "celular médio" (CPU 4x mais lenta).
// O fps no headless usa GPU por software: vale para comparar versões, não
// como número real; o real é medido no celular.
// Uso: node scripts/medir-3d.mjs http://localhost:3100
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3100";
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
});

// Counts draw calls per animation frame.
await context.addInitScript(() => {
  window.__draws = 0;
  for (const proto of [
    WebGLRenderingContext.prototype,
    WebGL2RenderingContext.prototype,
  ]) {
    for (const name of [
      "drawElements",
      "drawArrays",
      "drawElementsInstanced",
      "drawArraysInstanced",
    ]) {
      const original = proto[name];
      if (!original) continue;
      proto[name] = function (...args) {
        window.__draws++;
        return original.apply(this, args);
      };
    }
  }
});

const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 }); // mid-range phone
await cdp.send("Performance.enable");

async function heapMB() {
  await cdp.send("HeapProfiler.collectGarbage");
  const { metrics } = await cdp.send("Performance.getMetrics");
  const used = metrics.find((m) => m.name === "JSHeapUsedSize").value;
  return Math.round((used / 1024 / 1024) * 10) / 10;
}

async function fps(seconds) {
  return page.evaluate(
    (ms) =>
      new Promise((resolve) => {
        let frames = 0;
        const start = performance.now();
        const tick = () => {
          frames++;
          if (performance.now() - start < ms) requestAnimationFrame(tick);
          else
            resolve(Math.round((frames * 1000) / (performance.now() - start)));
        };
        requestAnimationFrame(tick);
      }),
    seconds * 1000,
  );
}

async function drawsPerFrame() {
  await page.evaluate(() => (window.__draws = 0));
  const frames = await fps(2);
  const draws = await page.evaluate(() => window.__draws);
  return { frames, draws };
}

const out = {};

// 1. Building (lab: 8 floors x 4) and a big one: draw calls while orbiting.
await page.goto(`${base}/lab/3d`);
const canvas = page.locator("canvas").first();
await canvas.waitFor({ timeout: 60000 });
await page.waitForTimeout(2000);
const box = await canvas.boundingBox();
const orbit = async () => {
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 0; i < 40; i++) {
    await page.mouse.move(
      box.x + box.width / 2 + i * 3,
      box.y + box.height / 2,
      { steps: 1 },
    );
  }
  await page.mouse.up();
};
// Draw calls of ONE frame: the most seen in a frame while orbiting.
await page.evaluate(() => {
  window.__maxDraws = 0;
  let last = window.__draws;
  const count = () => {
    window.__maxDraws = Math.max(window.__maxDraws, window.__draws - last);
    last = window.__draws;
    requestAnimationFrame(count);
  };
  requestAnimationFrame(count);
});
await orbit();
out.buildingDrawsPerFrame = await page.evaluate(() => window.__maxDraws);

// 2. Walk mode: fps while walking.
await page.goto(`${base}/e/residencial-casa-nova/u/101`);
await page.locator("canvas").first().waitFor({ timeout: 60000 });
out.heapStart = await heapMB();
await page.getByRole("button", { name: "Caminhar por dentro" }).click();
await page.locator('[data-mode="walk"] canvas').waitFor({ timeout: 60000 });
await page.waitForTimeout(1500);
await page.keyboard.down("KeyW");
const walking = await drawsPerFrame();
await page.keyboard.up("KeyW");
out.walkFps = walking.frames;
out.walkDrawsPerFrame = Math.round(
  walking.draws / Math.max(1, walking.frames * 2),
);

// 3. Memory: switch the 3D 10 times (each switch mounts a new scene).
const heaps = [];
for (let i = 0; i < 10; i++) {
  await page.getByRole("button", { name: "Voltar à vista de cima" }).click();
  await page.locator('[data-mode="top"] canvas').waitFor({ timeout: 60000 });
  await page.getByRole("button", { name: "Caminhar por dentro" }).click();
  await page.locator('[data-mode="walk"] canvas').waitFor({ timeout: 60000 });
  if (i === 1 || i === 4 || i === 9) heaps.push(await heapMB());
}
out.heapAfterSwitches_2_5_10 = heaps;

console.log(JSON.stringify(out, null, 2));
await browser.close();
