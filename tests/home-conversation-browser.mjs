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
        await expect(guide.locator("[data-home-guide-needs] a")).toHaveCount(6);
        await expect(guide.locator("[data-home-guide-launcher]")).toBeVisible();
        await expect(guide.locator("[data-home-guide-dialog]")).toHaveCount(0);
        await expect(page.locator("[data-home-section-carousel]")).toHaveCount(1);
        const diagnosis = page.locator("[data-home-free-diagnosis-banner]");
        await expect(diagnosis).toHaveCount(1);
        const positions = await page.evaluate(() => {
          const slider = document.querySelector("[data-home-section-carousel]");
          const banner = document.querySelector("[data-home-free-diagnosis-banner]");
          const dialogue = document.querySelector("[data-home-conversation-guide]");
          return [slider, banner, dialogue].map(node => node?.getBoundingClientRect().top ?? -1);
        });
        assert.ok(positions[0] >= 0 && positions[0] < positions[1] && positions[1] < positions[2],
          "Homepage must show slider, free service, then question: " + JSON.stringify(positions));
        const requestButton = diagnosis.locator("[data-home-diagnosis-order]");
        await requestButton.click();
        await expect(requestButton).toHaveAttribute("aria-expanded", "true");
        await expect(diagnosis.locator("[data-compact-lead-form]")).toBeVisible();
        await expect(diagnosis.locator('input[name="contact"]')).toBeVisible();
        await requestButton.click();
        await expect(requestButton).toHaveAttribute("aria-expanded", "false");
        await expect(diagnosis.locator("[data-compact-lead-form]")).toBeHidden();
        const geometry = await guide.evaluate(node => {
          const rect = node.getBoundingClientRect();
          return { left: rect.left, right: rect.right, viewport: window.innerWidth };
        });
        assert.ok(geometry.left >= -1 && geometry.right <= width + 1,
          scenario.locale + "/" + width + " guide clipped: " + JSON.stringify(geometry));
        const visualFit = await page.evaluate(() => {
          const masthead = document.querySelector(".house-home--services > .house-header--services");
          const hero = document.querySelector("[data-home-conversation-guide] [class*=intro]");
          const firstTile = document.querySelector('[data-home-conversation-guide] [data-home-guide-need="stress"]');
          if (!masthead || !hero || !firstTile) return null;
          const mastheadBox = masthead.getBoundingClientRect();
          const heroBox = hero.getBoundingClientRect();
          const titleBox = hero.querySelector("h2")?.getBoundingClientRect();
          return {
            headerInside: mastheadBox.left >= -1 && mastheadBox.right <= window.innerWidth + 1,
            headerContentFits: masthead.scrollWidth <= masthead.clientWidth + 2,
            heroTitleInside: Boolean(titleBox && titleBox.left >= heroBox.left - 1 && titleBox.right <= heroBox.right + 1),
            starterTileHeight: firstTile.getBoundingClientRect().height,
            starterTileColor: getComputedStyle(firstTile).color,
          };
        });
        assert.ok(visualFit && visualFit.headerInside && visualFit.headerContentFits && visualFit.heroTitleInside,
          scenario.locale + "/" + width + " masthead or pine hero overflows: " + JSON.stringify(visualFit));
        assert.ok(visualFit.starterTileHeight >= 70, "Quick request cards must stay easy to tap");
        assert.equal(visualFit.starterTileColor, "rgb(7, 78, 80)", "Evergreen featured topic must match Ideas");
        if (width === 390) {
          await page.screenshot({ path: `artifacts/home-conversation/${engineName}-${scenario.locale}-collapsed.png` });
        }
        const lang = scenario.locale;
        const needLinks = {
          stress: "/" + lang + "/courses/antistress",
          relationships: "/" + lang + "/services/free-situation-review",
          direction: "/" + lang + "/books",
          business: "/" + (lang === "ru" ? "ru" : "en") + "/app/business",
          resources: "/" + lang + "/services/dao-health-profile",
          reiki: "/" + lang + "/academy/reiki/free-practitioner-course",
        };
        for (const [id, href] of Object.entries(needLinks)) {
          const card = guide.locator('[data-home-guide-need="' + id + '"]');
          await expect(card).toBeVisible();
          await expect(card).toHaveAttribute("href", href);
          assert.ok((await card.locator("small").innerText()).trim().length >= 5,
            "Every need must identify its helpful site category");
        }
        const boardFit = await guide.evaluate(node => {
          const grid = node.querySelector("[data-home-guide-needs]");
          return {
            height: node.getBoundingClientRect().height,
            sectionOverflows: node.scrollHeight > node.clientHeight + 2,
            categoryOverflows: Boolean(grid && grid.scrollWidth > grid.clientWidth + 2),
            columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").length : 0,
          };
        });
        assert.ok(boardFit.height <= 610 && !boardFit.sectionOverflows && !boardFit.categoryOverflows,
          lang + "/" + width + " six-card board must fit within one 820px screen without internal scrolling: " + JSON.stringify(boardFit));
        assert.equal(boardFit.columns, 2, "Phone needs grid must have two columns");
        if (width === 390) {
          await guide.scrollIntoViewIfNeeded();
          await page.screenshot({path: `artifacts/home-conversation/${engineName}-${scenario.locale}-needs.png`});
        }
        await guide.locator("[data-home-guide-launcher]").click();
        const dialog = guide.locator("[data-home-guide-dialog]");
        await expect(dialog).toHaveAttribute("aria-modal", "true");
        await expect(dialog.getByRole("button", { name: scenario.send })).toHaveCSS("min-height", "44px");
        const composerFit = await dialog.evaluate(node => {
          const row = node.querySelector("[class*=inputRow]");
          const send = row?.querySelector("button[type=submit]");
          if (!row || !send) return null;
          const outer = row.getBoundingClientRect(), inner = send.getBoundingClientRect();
          return { inside: inner.left >= outer.left && inner.right <= outer.right &&
              inner.top >= outer.top && inner.bottom <= outer.bottom,
            overflow: row.scrollWidth > row.clientWidth + 1 };
        });
        assert.ok(composerFit && composerFit.inside && !composerFit.overflow,
          scenario.locale + "/" + width + " chat composer must fit: " + JSON.stringify(composerFit));
        const dialogBox = await dialog.boundingBox();
        assert.ok(dialogBox && dialogBox.x >= -1 && dialogBox.x + dialogBox.width <= width + 1,
          "Dialog extends beyond the mobile viewport");
        const question = dialog.locator("textarea");
        await question.fill(scenario.text);
        await guide.getByRole("button", { name: scenario.send }).click();
        await expect(guide).toHaveAttribute("data-guide-phase", "conversation");
        await expect(guide.locator("[data-home-guide-choices]")).toBeVisible();
        const currentChoices = await guide.locator("[data-home-guide-choices] button").count();
        assert.ok(currentChoices >= 2 && currentChoices <= 3, "At most three contextual choices");
        await guide.getByRole("button", { name: scenario.goal, exact: true }).click();
        const primary = guide.locator("[data-home-guide-result] a").first();
        await expect(primary).toHaveAttribute("href", scenario.href);
        await expect(primary).toBeVisible();
        assert.ok(await guide.locator("[data-home-guide-offer]").count() <= 2, "No more than two specific offers");
        await expect(guide.locator("[data-home-guide-change]")).toBeVisible();
        if (scenario.href.endsWith("/app/business") && width === 390) {
          await question.fill({ en: "I'm just starting", ru: "Я только начинаю", es: "Estoy empezando" }[scenario.locale]);
          await dialog.getByRole("button", { name: scenario.send }).click();
          await expect(guide.locator("[data-home-guide-result] a").first()).toHaveAttribute("href", scenario.href);
        }
        if (width === 390) {
          await page.screenshot({ path: `artifacts/home-conversation/${engineName}-${scenario.locale}-dialog.png` });
        }
        const bubbleText = await guide.locator('[role="log"]').innerText();
        assert.ok(bubbleText.includes(scenario.text), "Question should remain visible only in local dialogue");
        await guide.getByRole("button", { name: scenario.reset }).click();
        await expect(guide.locator("[data-home-guide-choices]")).toHaveCount(0);
        await expect(question).toHaveValue("");
        await expect(guide).toHaveAttribute("data-guide-phase", "ready");
        if (width === 320) {
          await question.fill("I want to kill myself");
          await dialog.getByRole("button", { name: scenario.send }).click();
          await expect(guide.locator("[data-home-guide-result]")).toHaveCount(0);
          await expect(guide.locator("[data-home-guide-choices]")).toHaveCount(0);
          await dialog.getByRole("button", { name: scenario.reset }).click();
        }
        await page.keyboard.press("Escape");
        await expect(guide.locator("[data-home-guide-dialog]")).toHaveCount(0);
        await expect(guide.locator("[data-home-guide-launcher]")).toBeVisible();
        // Chat is a separate button: the full composer only appears in the modal.
        await expect(guide.locator("#home-guide-entry-question")).toHaveCount(0);
        await guide.locator("[data-home-guide-launcher]").click();
        await expect(guide.locator("[data-home-guide-dialog]")).toBeVisible();
        await dialog.locator("textarea").fill(scenario.text);
        await dialog.getByRole("button", { name: scenario.send }).click();
        await expect(guide.locator('[role="log"]')).toContainText(scenario.text);
        await expect(guide.locator("[data-home-guide-choices]")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(guide.locator("[data-home-guide-dialog]")).toHaveCount(0);
        assert.deepEqual(leak, [], "Private question must not leak through request URLs");
        assert.deepEqual(errors, [], "Homepage javascript error");
        evidence.cases.push({ locale: scenario.locale, width, visible: true, route: scenario.href, reset: true, noUrlLeak: true });
      } finally {
        await context.close();
      }
    }
  }
  // Regression for the iPhone report: the public six-item bar must stay
  // attached to the VISIBLE viewport, including after scroll restoration.
  // The 280px CSS displacement reproduces the detached-layer geometry and
  // proves the correction also resets when the browser viewport recovers.
  for (const scenario of scenarios.slice(0, 3)) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 820 },
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    try {
      await page.goto(host + scenario.path, { waitUntil: "domcontentloaded", timeout: 30000 });
      const bottom = page.locator(".mobile-bottom-navigation");
      await expect(bottom).toBeVisible();
      const expectDocked = async phase => {
        await expect.poll(async () => bottom.evaluate(element => {
          const rect = element.getBoundingClientRect();
          const viewport = window.visualViewport;
          const visibleBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
          return Math.abs(visibleBottom - rect.bottom);
        }), {
          message: scenario.locale + "/" + phase + " bottom navigation must touch visible viewport edge",
          timeout: 6000,
        }).toBeLessThan(3);
      };
      await expectDocked("initial");
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await expectDocked("scroll-end");
      await bottom.evaluate(element => {
        element.style.bottom = "280px";
        window.dispatchEvent(new Event("resize"));
      });
      await expectDocked("detached-layer-recovery");
      await bottom.evaluate(element => {
        element.style.removeProperty("bottom");
        window.dispatchEvent(new Event("resize"));
      });
      await expectDocked("restored");
      await expect(bottom.locator("a")).toHaveCount(6);
      assert.deepEqual(errors, [], "Bottom bar re-anchoring must not throw");
      if (scenario.locale === "ru") {
        await page.screenshot({ path: `artifacts/home-conversation/${engineName}-ru-bottom-nav-docked.png` });
      }
      evidence.cases.push({ locale: scenario.locale, width: 390, viewportDocked: true, recoveredAfterDisplacement: true });
    } finally {
      await context.close();
    }
  }

  // Simulated browser recognition tests the full 2-tap UI without capturing audio
  // or relying on Safari's remote recognition/permission provider.
  for (const scenario of scenarios.slice(0, 3)) {
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
  // Browser speech implementations vary. These cases exercise the *failure*
  // paths in real Next/React/WebKit DOM without permission prompts or speech uploads.
  const finishName = {
    en: "Finish and send",
    ru: "Завершить и отправить",
    es: "Terminar y enviar",
  };
  const keyboardName = {
    en: "Open keyboard",
    ru: "Открыть клавиатуру",
    es: "Abrir teclado",
  };
  const failureCases = [
    { kind: "permission", locale: "en", path: "/", text: "I am worried about work" },
    { kind: "start-hang", locale: "ru", path: "/ru", text: "Я тревожусь и хочу помощи" },
    { kind: "stop-hang", locale: "es", path: "/es", text: "Tengo miedo y mucha ansiedad" },
    { kind: "natural-final", locale: "en", path: "/", text: "I feel stressed and anxious" },
    { kind: "unsupported", locale: "ru", path: "/ru", text: "Я тревожусь" },
  ];
  for (const sample of failureCases) {
    const context = await browser.newContext({ viewport: { width: 320, height: 820 }, serviceWorkers: "block" });
    await context.addInitScript(kind => {
      class TestRecognizer {
        start() {
          window.__voiceTest = this;
          if (kind !== "start-hang") this.onstart?.();
        }
        stop() { if (kind !== "stop-hang" && kind !== "start-hang") this.onend?.(); }
        abort() { this.onend?.(); }
      }
      window.SpeechRecognition = kind === "unsupported" ? undefined : TestRecognizer;
      window.webkitSpeechRecognition = kind === "unsupported" ? undefined : TestRecognizer;
    }, sample.kind);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    try {
      if (sample.kind === "start-hang" || sample.kind === "stop-hang") await page.clock.install();
      await page.goto(host + sample.path, { waitUntil: "domcontentloaded", timeout: 30000 });
      const guide = page.locator("[data-home-conversation-guide]");
      await guide.locator("[data-home-guide-launcher-mic]").click();
      await expect(guide.locator("[data-home-guide-dialog]")).toBeVisible();
      if (sample.kind === "unsupported") {
        await expect(guide.locator("[data-home-voice-recording]")).toHaveCount(0);
        await expect(guide.locator('[role="alert"]')).toBeVisible();
        await guide.getByRole("button", { name: keyboardName[sample.locale] }).click();
        await expect(guide.locator("[data-home-guide-dialog] textarea")).toBeFocused();
      }
      if (sample.kind === "permission") {
        await expect(guide.locator("[data-home-voice-recording]")).toBeVisible();
        await page.evaluate(() => window.__voiceTest.onerror?.({ error: "not-allowed" }));
        await expect(guide.locator("[data-home-voice-recording]")).toHaveCount(0);
        await expect(guide.locator('[role="alert"]')).toBeVisible();
        await guide.getByRole("button", { name: keyboardName[sample.locale] }).click();
        await expect(guide.locator("[data-home-guide-dialog] textarea")).toBeFocused();
        assert.ok(!(await guide.locator('[role="log"]').innerText()).includes(sample.text),
          "Denied microphone must not create a question");
      }
      if (sample.kind === "start-hang") {
        await expect(guide.locator("[data-home-voice-recording]")).toBeVisible();
        await page.clock.fastForward(25100);
        await expect(guide.locator("[data-home-voice-recording]")).toHaveCount(0);
        await expect(guide.locator('[role="alert"]')).toBeVisible();
        assert.ok(!(await guide.locator('[role="log"]').innerText()).includes(sample.text),
          "Unresponsive microphone must not submit anything");
      }
      if (sample.kind === "stop-hang") {
        await page.evaluate(text => window.__voiceTest.onresult({
          results: [[{ transcript: text }]],
        }), sample.text);
        await guide.getByRole("button", { name: finishName[sample.locale] }).click();
        await expect(guide.locator("[data-home-voice-recording]")).toBeVisible();
        await page.clock.fastForward(2600);
        await expect(guide.locator("[data-home-voice-recording]")).toHaveCount(0);
        await expect(guide.locator('[role="log"]')).toContainText(sample.text);
      }
      if (sample.kind === "natural-final") {
        await page.evaluate(text => {
          const finalResult = [{ transcript: text }];
          finalResult.isFinal = true;
          window.__voiceTest.onresult({ results: [finalResult] });
          window.__voiceTest.onend();
        }, sample.text);
        await expect(guide.locator("[data-home-voice-recording]")).toHaveCount(0);
        await expect(guide.locator('[role="log"]')).toContainText(sample.text);
      }
      assert.deepEqual(errors, [], sample.kind + " must not throw client errors");
      evidence.cases.push({ kind: sample.kind, locale: sample.locale, width: 320, recovered: true });
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
