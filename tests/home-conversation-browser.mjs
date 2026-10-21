import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, webkit, expect } from "@playwright/test";

// Exercises the actual built Next.js homepage without a user account, provider,
// speech permission, personal data, outbound messages, or external paid API.
const engineName = process.env.HH_TEST_BROWSER || "chromium";
assert.ok(["chromium", "webkit"].includes(engineName), "Invalid browser");
const browserType = engineName === "webkit" ? webkit : chromium;
const port = 3187;
const host = "http://127.0.0.1:" + port;
let logs = "";
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "--hostname", "127.0.0.1"], {
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
for (const stream of [server.stdout, server.stderr]) {
  stream.on("data", part => { logs = (logs + part.toString()).slice(-25000); });
}
const evidence = { browser: engineName, cases: [] };
mkdirSync("artifacts/home-conversation", { recursive: true });

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error("Next server exited early: " + logs.slice(-2000));
    try {
      const response = await fetch(host, { signal: AbortSignal.timeout(2500) });
      if (response.ok) return;
    } catch { /* Next may still be warming up. */ }
    await delay(450);
  }
  throw new Error("Next server was not ready: " + logs.slice(-2000));
}
const scenarios = [
  { locale: "en", path: "/", text: "I'm anxious about work and need support", send: "Get guidance", goal: "Explore free tests", reset: "Start over", href: "/en/client/tests" },
  { locale: "ru", path: "/ru", text: "Я тревожусь и испытываю стресс", send: "Получить подсказку", goal: "Бесплатные тесты", reset: "Новый разговор", href: "/ru/client/tests" },
  { locale: "es", path: "/es", text: "Tengo miedo y mucha ansiedad", send: "Recibir orientación", goal: "Pruebas gratuitas", reset: "Nueva conversación", href: "/en/client/tests" },
];
let browser;
try {
  await waitForServer();
  browser = await browserType.launch();
  for (const scenario of scenarios) {
    for (const width of [320, 375, 390, 430]) {
      const context = await browser.newContext({ viewport: { width, height: 820 }, serviceWorkers: "block" });
      const page = await context.newPage();
      const errors = [];
      const leak = [];
      page.on("pageerror", err => errors.push(err.message));
      page.on("request", req => {
        if (req.url().includes(encodeURIComponent(scenario.text)) || req.url().includes(scenario.text)) leak.push(req.url());
      });
      try {
        await page.goto(host + scenario.path, { waitUntil: "domcontentloaded", timeout: 30000 });
        const guide = page.locator("[data-home-conversation-guide]");
        await expect(guide).toHaveCount(1);
        await expect(guide).toBeVisible();
        await expect(guide).toHaveAttribute("data-guide-phase", "ready");
        await expect(guide.locator("div[class*=quickChoices] button")).toHaveCount(3);
        await expect(guide.locator("[data-home-guide-launcher]")).toBeVisible();
        await expect(guide.locator("[data-home-guide-dialog]")).toHaveCount(0);
        await expect(page.locator("[data-home-section-carousel]")).toHaveCount(1);
        const geometry = await guide.evaluate(node => {
          const rect = node.getBoundingClientRect();
          return { left: rect.left, right: rect.right, viewport: window.innerWidth };
        });
        assert.ok(geometry.left >= -1 && geometry.right <= width + 1,
          scenario.locale + "/" + width + " guide clipped: " + JSON.stringify(geometry));
        if (width === 390) {
          await page.screenshot({ path: `artifacts/home-conversation/${engineName}-${scenario.locale}-collapsed.png` });
        }
        await guide.locator("[data-home-guide-launcher]").click();
        const dialog = guide.locator("[data-home-guide-dialog]");
        await expect(dialog).toHaveAttribute("aria-modal", "true");
        await expect(dialog.getByRole("button", { name: scenario.send })).toHaveCSS("min-height", "44px");
        const dialogBox = await dialog.boundingBox();
        assert.ok(dialogBox && dialogBox.x >= -1 && dialogBox.x + dialogBox.width <= width + 1,
          "Dialog extends beyond the mobile viewport");
        const question = guide.locator("textarea");
        await question.fill(scenario.text);
        await guide.getByRole("button", { name: scenario.send }).click();
        await expect(guide).toHaveAttribute("data-guide-phase", "conversation");
        await expect(guide.locator("[data-home-guide-choices]")).toBeVisible();
        await expect(guide.locator("[data-home-guide-choices] button")).toHaveCount(3);
        await guide.getByRole("button", { name: scenario.goal, exact: true }).click();
        const primary = guide.locator("[data-home-guide-result] a").first();
        await expect(primary).toHaveAttribute("href", scenario.href);
        await expect(primary).toBeVisible();
        if (width === 390) {
          await page.screenshot({ path: `artifacts/home-conversation/${engineName}-${scenario.locale}-dialog.png` });
        }
        const bubbleText = await guide.locator('[role="log"]').innerText();
        assert.ok(bubbleText.includes(scenario.text), "Question should remain visible only in local dialogue");
        await guide.getByRole("button", { name: scenario.reset }).click();
        await expect(guide.locator("[data-home-guide-choices]")).toHaveCount(0);
        await expect(question).toHaveValue("");
        await expect(guide).toHaveAttribute("data-guide-phase", "ready");
        await page.keyboard.press("Escape");
        await expect(guide.locator("[data-home-guide-dialog]")).toHaveCount(0);
        await expect(guide.locator("[data-home-guide-launcher]")).toBeVisible();
        assert.deepEqual(leak, [], "Private question must not leak through request URLs");
        assert.deepEqual(errors, [], "Homepage javascript error");
        evidence.cases.push({ locale: scenario.locale, width, visible: true, route: scenario.href, reset: true, noUrlLeak: true });
      } finally {
        await context.close();
      }
    }
  }
  // Simulated browser recognition tests the full 2-tap UI without capturing audio
  // or relying on Safari's remote recognition/permission provider.
  for (const scenario of scenarios) {
    const context = await browser.newContext({ viewport: { width: 390, height: 820 }, serviceWorkers: "block" });
    await context.addInitScript(() => {
      class FakeSpeechRecognition {
        start() { window.__homeVoiceMock = this; this.onstart?.(); }
        stop() { this.onend?.(); }
        abort() { this.onend?.(); }
      }
      window.SpeechRecognition = FakeSpeechRecognition;
      window.webkitSpeechRecognition = FakeSpeechRecognition;
    });
    const page = await context.newPage();
    const errors = [];
    const leakedRequests = [];
    page.on("pageerror", err => errors.push(err.message));
    page.on("request", req => {
      if (req.url().includes(encodeURIComponent(scenario.text))) leakedRequests.push(req.url());
    });
    try {
      await page.goto(host + scenario.path, { waitUntil: "domcontentloaded", timeout: 30000 });
      const guide = page.locator("[data-home-conversation-guide]");
      const microphone = guide.locator("[data-home-guide-launcher-mic]");
      const microphoneLabel = { en: "Dictate a question with microphone", ru: "Продиктовать вопрос", es: "Dictar una pregunta" }[scenario.locale];
      const cancel = { en: "Cancel recording", ru: "Отменить запись", es: "Cancelar grabación" }[scenario.locale];
      const finish = { en: "Finish and send", ru: "Завершить и отправить", es: "Terminar y enviar" }[scenario.locale];
      await microphone.click();
      await expect(guide.locator("[data-home-guide-dialog]")).toBeVisible();
      await expect(guide.locator("[data-home-voice-recording]")).toBeVisible();
      await page.evaluate(text => {
        window.__homeVoiceMock.onresult({ results: [[{ transcript: text }]] });
      }, scenario.text);
      await expect(guide.locator("[data-home-voice-recording]")).toContainText(scenario.text);
      await guide.getByRole("button", { name: cancel }).click();
      await expect(guide.locator("[data-home-voice-recording]")).toHaveCount(0);
      assert.ok(!(await guide.locator('[role="log"]').innerText()).includes(scenario.text), "Cancel must not send");
      await guide.locator("[data-home-guide-dialog]").getByRole("button", { name: microphoneLabel }).click();
      await page.evaluate(text => {
        window.__homeVoiceMock.onresult({ results: [[{ transcript: text }]] });
      }, scenario.text);
      await guide.getByRole("button", { name: finish }).click();
      await expect(guide.locator("[data-home-voice-recording]")).toHaveCount(0);
      await expect(guide.locator('[role="log"]')).toContainText(scenario.text);
      await expect(guide.locator("[data-home-guide-choices]")).toBeVisible();
      assert.deepEqual(errors, [], "Voice UI JS error");
      assert.deepEqual(leakedRequests, [], "Spoken question must never leak through a request URL");
      evidence.cases.push({ locale: scenario.locale, width: 390, voiceMock: true, cancel: true, finishSends: true, noUrlLeak: true });
    } finally {
      await context.close();
    }
  }
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  writeFileSync("artifacts/home-conversation/" + engineName + ".json", JSON.stringify({ ...evidence, serverLogs: logs.slice(-3000) }, null, 2));
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
