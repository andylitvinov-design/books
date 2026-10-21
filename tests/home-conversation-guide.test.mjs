import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { homeGuideDestinations, homeGuideGoals, resolveHomeGuideQuestion } from "../lib/home-conversation.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("first-screen guide routes EN/RU/ES questions with existing Ideas classifier", () => {
  const samples = [
    ["My partner and I have a conflict", "en", "relationships"],
    ["Постоянная тревога и стресс", "en", "stress"],
    ["Я устала, нет энергии", "ru", "resources"],
    ["Tengo miedo y mucha ansiedad", "en", "stress"],
    ["Mi trabajo y mi negocio", "es", "work"],
  ];
  for (const [question, fallback, topic] of samples) {
    const result = resolveHomeGuideQuestion(question, fallback);
    assert.equal(result.topic, topic, question);
    assert.equal(result.matched, true);
    assert.equal(result.urgent, false);
  }
  assert.equal(resolveHomeGuideQuestion("Просто вопрос", "ru").matched, false);
});

test("expressions of immediate self-harm risk do not generate promotional recommendations", () => {
  for (const phrase of ["I want to kill myself", "Хочу покончить с собой", "Quiero suicidarme"]) {
    const answer = resolveHomeGuideQuestion(phrase);
    assert.equal(answer.urgent, true, phrase);
    assert.equal(answer.topic, null, phrase);
  }
  assert.equal(resolveHomeGuideQuestion("I feel stress and need advice").urgent, false);
});

test("each conversation goal resolves to a real first-party destination without exposing the question", () => {
  assert.equal(homeGuideGoals.length, 5);
  for (const locale of ["ru", "en", "es"]) {
    for (const goal of homeGuideGoals) {
      const result = homeGuideDestinations({ goal, topic: "relationships", locale });
      assert.match(result.primary, /^\/(en|ru|es)\/[a-z/#-]+$/);
      assert.match(result.secondary, /^\/(en|ru|es)\/[a-z/#-]+$/);
      assert.doesNotMatch(result.primary + result.secondary, /[?&]|question=|prompt=/);
    }
  }
  assert.equal(homeGuideDestinations({ goal: "tests", topic: "stress", locale: "es" }).primary, "/en/client/tests");
  assert.equal(homeGuideDestinations({ goal: "consult", topic: "work", locale: "ru" }).primary, "/ru/services#consultation");
  assert.equal(homeGuideDestinations({ goal: "practice", topic: "work", locale: "es" }).secondary, "/es/explore/business");
});

test("EN/RU/ES homepages surface an editable dialogue before the existing photo carousel", () => {
  const home = read("components/holistic-house-home.tsx");
  const spanish = read("app/es/page.tsx");
  const russian = read("app/[locale]/page.tsx");
  for (const [page, entry, carousel] of [
    [home, "<HomeConversationGuide locale={locale} />", "<HomeSectionCarousel locale={locale} />"],
    [spanish, '<HomeConversationGuide locale="es" />', '<HomeSectionCarousel locale="es" />'],
  ]) {
    assert.ok(page.includes(entry));
    assert.ok(page.indexOf(entry) < page.indexOf(carousel), "First-screen guide must precede existing slider");
    assert.ok(page.includes("paid-sessions"), "Existing paid CTA must stay");
  }
  assert.ok(russian.includes("<HolisticHouseHome"));
});

test("browser-only conversation supports multiple turns, voice consent, accessibility and compact mobile", () => {
  const component = read("components/home-conversation-guide.tsx");
  const css = read("components/home-conversation-guide.module.css");
  for (const fragment of [
    'data-home-conversation-guide',
    'role="log"',
    'aria-live="polite"',
    'maxLength={500}',
    'onSubmit={submit}',
    'homeGuideGoals.map',
    "appendExchange",
    "new Speech()",
    "engine.start()",
    "SpeechRecognition",
    "speechRef.current?.stop()",
    "result.urgent",
    "context.urgent",
    "t.privacyDetail",
  ]) assert.ok(component.includes(fragment), fragment);
  for (const forbidden of ["fetch(", "sendBeacon(", "localStorage", "sessionStorage", "postMessage(", "/api/"]) {
    assert.ok(!component.includes(forbidden), forbidden + " must not receive visitor free text");
  }
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /min-width: 0/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /-webkit-overflow-scrolling: touch/);
});

test("one-tap ChatGPT-style microphone is local, cancellable, and sends recognized words on finish", () => {
  const component = read("components/home-conversation-guide.tsx");
  const css = read("components/home-conversation-guide.module.css");
  for (const token of [
    'data-home-voice-recording',
    'engine.interimResults = true',
    'engine.onstart =',
    'engine.onresult =',
    'engine.onend =',
    'submitOnEndRef.current = true',
    'voiceDiscardRef.current = true',
    'onClick={finishVoice}',
    'onClick={cancelVoice}',
    't.voiceKeyboard',
    't.voicePrivacy',
    'onKeyDown={event =>',
    'voiceStartedAtRef.current = 0',
    'setVoiceState("finishing")',
  ]) assert.ok(component.includes(token), token);
  assert.match(css, /\.recordingMessage\s*\{[^}]*text-overflow: ellipsis/);
  assert.match(css, /\.quickChoices\s*\{[^}]*grid-template-columns: repeat\(3,/);
  assert.match(css, /ideas-pine-reference\.webp/);
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(component, /data-guide-phase=\{turns\.length === 0/);
  assert.match(component, /className=\{styles\.inputRow\}/);
  assert.match(component, /role="dialog" aria-modal="true"/, "conversation lives in a dialog");
  assert.match(component, /data-home-guide-launcher/, "homepage only shows a compact launcher");
  assert.match(component, /data-home-guide-launcher-mic/, "one-tap microphone opens the dialog");
  assert.match(component, /goalSuggestions/, "only contextual choices should be prominent");
  assert.match(component, /document.body.style.overflow = "hidden"/, "mobile chat keeps the page from scrolling");
  assert.match(css, /\.chatScroll\s*\{[^}]*overflow-y: auto/, "messages scroll inside the dialog");
  assert.match(css, /\.dialog\s*\{[^}]*flex-direction: column/, "mobile dialog has a fixed header and composer");
  assert.match(css, /\.form textarea \{[^}]*resize: none/);
  assert.match(css, /\.recordingDot \{ animation: none;/);
  for (const forbidden of ["MediaRecorder", "getUserMedia(", "fetch(", "localStorage", "sessionStorage"]) {
    assert.ok(!component.includes(forbidden), "Speech-to-text should not save raw audio or send private text: " + forbidden);
  }
});
