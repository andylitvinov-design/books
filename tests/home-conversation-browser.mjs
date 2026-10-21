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
  { locale: "en", path: "/", text: "I need clients for my business", send: "Get guidance", goal: "Developing my business", reset: "Start over", href: "/en/app/business" },
  { locale: "ru", path: "/ru", text: "Мне нужны клиенты для бизнеса", send: "Получить подсказку", goal: "Развиваю своё дело", reset: "Новый разговор", href: "/ru/app/business" },
  { locale: "es", path: "/es", text: "Necesito ayuda con mi negocio", send: "Recibir orientación", goal: "Desarrollo mi negocio", reset: "Nueva conversación", href: "/en/app/business" },
  { locale: "en", path: "/", text: "I want to learn Reiki", send: "Get guidance", goal: "Explore the free course", reset: "Start over", href: "/en/academy/reiki/free-practitioner-course" },
  { locale: "ru", path: "/ru", text: "Хочу познакомиться с Рейки", send: "Получить подсказку", goal: "Пройти бесплатный курс", reset: "Новый разговор", href: "/ru/academy/reiki/free-practitioner-course" },
  { locale: "es", path: "/es", text: "Quiero aprender Reiki", send: "Recibir orientación", goal: "Explorar el curso gratis", reset: "Nueva conversación", href: "/es/academy/reiki/free-practitioner-course" },
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
        const outbound = req.url() + " " + (req.postData() || "");
        if (outbound.includes(encodeURIComponent(scenario.text)) || outbound.includes(scenario.text)) leak.push(req.url());
      });
      try {
        await page.goto(host + scenario.path, { waitUntil: "domcontentloaded", timeout: 30000 });
        const guide = page.locator("[data-home-conversation-guide]");
        await expect(guide).toHaveCount(1);
        await expect(guide).toBeVisible();
        await expect(guide).toHaveAttribute("data-guide-phase", "ready");
        await expect(guide.locator("div[class*=quickChoices] button")).toHaveCount(3);
        await expect(guide.getByRole("button", { name: scenario.send })).toHaveCSS("min-height", "46px");
        await expect(page.locator("[data-home-section-carousel]")).toHaveCount(1);
        const geometry = await guide.evaluate(node => {
          const rect = node.getBoundingClientRect();
          return { left: rect.left, right: rect.right, viewport: window.innerWidth };
        });
        assert.ok(geometry.left >= -1 && geometry.right <= width + 1,
          scenario.locale + "/" + width + " guide clipped: " + JSON.stringify(geometry));
        const question = guide.locator("textarea");
        await question.fill(scenario.text);
        await guide.getByRole("button", { name: scenario.send }).click();
        await expect(guide).toHaveAttribute("data-guide-phase", "conversation");
        await expect(guide.locator("[data-home-guide-choices]")).toBeVisible();
        await guide.getByRole("button", { name: scenario.goal, exact: true }).click();
        const primary = guide.locator("[data-home-guide-result] a").first();
        await expect(primary).toHaveAttribute("href", scenario.href);
        await expect(primary).toBeVisible();
        assert.ok(await guide.locator("[data-home-guide-offer]").count() <= 2);
        await expect(guide.locator("[data-home-guide-reiki-entry] a")).toHaveAttribute("href", "/en/academy/principles-of-energywork/learn");
        const bubbleText = await guide.locator('[role="log"]').innerText();
        assert.ok(bubbleText.includes(scenario.text), "Question should remain visible only in local dialogue");
        await guide.getByRole("button", { name: scenario.reset }).click();
        await expect(guide.locator("[data-home-guide-choices]")).toHaveCount(0);
        await expect(question).toHaveValue("");
        await expect(guide).toHaveAttribute("data-guide-phase", "ready");
        await question.fill("I want to kill myself");
        await guide.getByRole("button", { name: scenario.send }).click();
        await expect(guide.locator("[data-home-guide-result]")).toHaveCount(0);
        await expect(guide.locator("[data-home-guide-choices]")).toHaveCount(0);
        await expect(guide.locator("[data-home-guide-reiki-entry]")).toHaveCount(0);
        await question.fill("business");
        await guide.getByRole("button", { name: scenario.send }).click();
        await expect(guide.locator("[data-home-guide-reiki-entry]")).toHaveCount(0);
        await guide.getByRole("button", { name: scenario.reset }).click();
        await expect(guide.locator("[data-home-guide-reiki-entry]")).toHaveCount(1);
        assert.deepEqual(leak, [], "Private question must not leak through request URLs or bodies");
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
      const microphone = guide.getByRole("button", { name: {
        en: "Dictate a question with microphone", ru: "Продиктовать вопрос", es: "Dictar una pregunta",
      }[scenario.locale] });
      const cancel = { en: "Cancel recording", ru: "Отменить запись", es: "Cancelar grabación" }[scenario.locale];
      const finish = { en: "Finish and send", ru: "Завершить и отправить", es: "Terminar y enviar" }[scenario.locale];
      await microphone.click();
      await expect(guide.locator("[data-home-voice-recording]")).toBeVisible();
      await page.evaluate(text => {
        window.__homeVoiceMock.onresult({ results: [[{ transcript: text }]] });
      }, scenario.text);
      await expect(guide.locator("[data-home-voice-recording]")).toContainText(scenario.text);
      await guide.getByRole("button", { name: cancel }).click();
      await expect(guide.locator("[data-home-voice-recording]")).toHaveCount(0);
      assert.ok(!(await guide.locator('[role="log"]').innerText()).includes(scenario.text), "Cancel must not send");
      await microphone.click();
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

