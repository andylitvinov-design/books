import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { homeGuideDestinations, homeGuideGoals, resolveHomeGuideQuestion, homeGuideFollowup, chooseHomeGuideOffer, matchHomeGuideReply } from "../lib/home-conversation.mjs";

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
    'followup.choices.slice(0, 3).map',
    "appendExchange",
    "new Speech()",
    "engine.start()",
    "SpeechRecognition",
    "try { engine.stop(); }",
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
  assert.match(component, /followup.choices.slice/, "only topic-matched choices are shown");
  assert.match(component, /document.body.style.overflow = "hidden"/, "mobile chat keeps the page from scrolling");
  assert.match(css, /\.chatScroll\s*\{[^}]*overflow-y: auto/, "messages scroll inside the dialog");
  assert.match(css, /\.dialog\s*\{[^}]*flex-direction: column/, "mobile dialog has a fixed header and composer");
  assert.match(css, /\.form textarea \{[^}]*resize: none/);
  assert.match(css, /\.recordingDot \{ animation: none;/);
  for (const forbidden of ["MediaRecorder", "getUserMedia(", "fetch(", "localStorage", "sessionStorage"]) {
    assert.ok(!component.includes(forbidden), "Speech-to-text should not save raw audio or send private text: " + forbidden);
  }
});

test("Safari voice lifecycle is bounded and never silently sends interrupted speech", () => {
  const component = read("components/home-conversation-guide.tsx");
  const css = read("components/home-conversation-guide.module.css");
  for (const token of [
    'data-voice-state={voiceState}',
    'voiceStartTimerRef.current = window.setTimeout(failUnresponsive, 25000)',
    'voiceProgressTimerRef.current = window.setTimeout(failUnresponsive, 18000)',
    'voiceStopTimerRef.current = window.setTimeout',
    'voiceGenerationRef.current === generation',
    'voiceFailureRef.current = true',
    'voiceFinalRef.current = results.length > 0 && results.every(item => item.isFinal === true)',
    'voiceDiscardRef.current = true',
    'if (engine?.abort) engine.abort()',
    'window.addEventListener("pagehide", onPageHide)',
    'engine.continuous = !isIosWebKit',
    'const spoken = voiceTextRef.current.trim()',
    'if (!voiceFailureRef.current && (submitOnEndRef.current || voiceFinalRef.current)) ask(complete)',
    'questionRef.current?.focus()',
    'voiceKeyboardAction',
  ]) assert.ok(component.includes(token), token);
  assert.match(component, /<button type="submit" className=\{styles\.sendButton\}/);
  assert.match(component, /<div className=\{styles\.inputRow\}>[\s\S]*?<button type="submit" className=\{styles\.sendButton\}/);
  assert.match(css, /\.voiceButton, \.sendButton, \.cancelVoice, \.finishVoice \{[^}]*min-width: 44px;/);
  assert.match(css, /\.voiceRecovery button \{[^}]*min-height: 44px;/);
  assert.match(css, /\.recordingDot\[data-state="starting"\]/);
  for (const forbidden of ["MediaRecorder", "getUserMedia(", "fetch(", "sendBeacon(", "localStorage", "sessionStorage"]) {
    assert.ok(!component.includes(forbidden), "No new raw audio or chat-content transmission: " + forbidden);
  }
});

const journeys = [
  ["I need clients for my business", "work-start", "business"],
  ["I want to grow my project", "work-grow", "business"],
  ["I want to develop my career", "work-career", "business"],
  ["Мне нужны клиенты для бизнеса", "work-grow", "business"],
  ["Хочу начать своё дело, бизнес", "work-start", "business"],
  ["Развиваю карьеру", "work-career", "business"],
  ["Necesito ayuda con mi negocio", "work-start", "business"],
  ["Quiero mejorar mi trabajo", "work-career", "business"],
  ["I feel stressed", "calm-practice", "antistress"],
  ["I am tired and need rest", "calm-practice", "antistress"],
  ["Постоянная тревога", "calm-practice", "antistress"],
  ["Устала, нет энергии", "self-check", "tests"],
  ["Tengo mucha ansiedad", "self-check", "tests"],
  ["Estoy cansado y sin energia", "calm-practice", "antistress"],
  ["I have a conflict with my partner", "written-review", "review"],
  ["Сложные отношения с партнёром", "written-review", "review"],
  ["Quiero hablar de mi pareja", "personal", "consult"],
  ["I want to learn Reiki", "reiki-course", "reiki"],
  ["Хочу познакомиться с Рейки", "reiki-course", "reiki"],
  ["Quiero aprender Reiki", "reiki-guidance", "reiki"],
  ["My business needs help", "personal", "consult"],
];
for (const [input, choiceId, expected] of journeys) test("specific offer: " + input, () => {
  const context = resolveHomeGuideQuestion(input);
  const result = chooseHomeGuideOffer(context, choiceId, context.lang);
  assert.ok(result, input);
  assert.equal(result.offers[0].id, expected);
  assert.ok(result.offers.length <= 2);
  for (const offer of result.offers) {
    assert.match(offer.href, /^\/(en|ru|es)\/[a-z/#-]+$/);
    assert.doesNotMatch(offer.href, /[?&]|academy$/);
    assert.equal(offer.checkoutStatus, "not_verified");
    assert.ok(offer.benefit && offer.detail && offer.action);
  }
});

test("contextual clarification is bounded and preserves a short follow-up", () => {
  const business = resolveHomeGuideQuestion("My business needs clients", "en");
  const next = resolveHomeGuideQuestion("Just starting", "en", business);
  assert.equal(next.topic, "work");
  assert.equal(chooseHomeGuideOffer(next, "work-start").offers[0].id, "business");
  const newTopic = resolveHomeGuideQuestion("I want to learn Reiki", "en", next);
  assert.equal(newTopic.interest, "reiki");
  assert.equal(chooseHomeGuideOffer(newTopic, "work-start"), null);
  const unknown = resolveHomeGuideQuestion("A question about something", "en");
  const clarified = chooseHomeGuideOffer(unknown, "topic-work");
  assert.deepEqual(clarified.offers, []);
  assert.equal(chooseHomeGuideOffer(clarified.context, "work-career").offers[0].id, "business");
  assert.notEqual(homeGuideFollowup(business).prompt.en, homeGuideFollowup(newTopic).prompt.en);
});

test("crisis suppresses all offers and remains protected until the conversation is reset", () => {
  for (const phrase of ["I want to kill myself", "Хочу покончить с собой", "Quiero suicidarme"]) {
    const urgent = resolveHomeGuideQuestion(phrase);
    assert.equal(homeGuideFollowup(urgent), null);
    assert.equal(chooseHomeGuideOffer(urgent, "personal"), null);
    assert.equal(resolveHomeGuideQuestion("business", "en", urgent).urgent, true);
  }
  assert.equal(resolveHomeGuideQuestion("business", "en", null).urgent, false);
});

test("routes use explicit EN fallbacks and never invent a paid checkout", () => {
  const business = chooseHomeGuideOffer(resolveHomeGuideQuestion("Mi negocio", "es"), "work-grow", "es").offers[0];
  assert.equal(business.href, "/en/app/business");
  assert.match(business.detail, /inglés/);
  const reiki = chooseHomeGuideOffer(resolveHomeGuideQuestion("Reiki", "es"), "reiki-course", "es").offers[0];
  assert.equal(reiki.href, "/es/academy/reiki/free-practitioner-course");
  assert.match(reiki.detail, /inglés/);
  const russianReiki = chooseHomeGuideOffer(resolveHomeGuideQuestion("Хочу Рейки", "ru"), "reiki-course", "ru").offers[0];
  assert.match(russianReiki.detail, /Курс откроется на английском/);
  assert.equal(chooseHomeGuideOffer(resolveHomeGuideQuestion("work"), "https://evil.test"), null);
  const source = read("lib/home-conversation.mjs");
  for (const forbidden of ["fetch(", "sendBeacon(", "localStorage", "sessionStorage", "/api/"]) assert.ok(!source.includes(forbidden));
});



test("natural replies are restricted to the contextual choice list",()=>{
 const work=resolveHomeGuideQuestion("My business needs clients");
 assert.equal(matchHomeGuideReply("I'm just starting",work),"work-start");
 assert.equal(matchHomeGuideReply("I already have customers",work),"work-grow");
 assert.equal(matchHomeGuideReply("Я развиваю карьеру",work),"work-career");
 assert.equal(matchHomeGuideReply("I'd like a consultation",work),"personal");
 assert.equal(matchHomeGuideReply("something unrelated",work),null);
 const stress=resolveHomeGuideQuestion("Постоянная тревога");
 assert.equal(matchHomeGuideReply("Хочу попробовать практику",stress),"calm-practice");
 assert.equal(matchHomeGuideReply("Пройду тест",stress),"self-check");
 assert.equal(matchHomeGuideReply("Grow my business",stress),null);
 assert.equal(matchHomeGuideReply("Quiero negocio",resolveHomeGuideQuestion("Something confusing")),"topic-work");
 assert.equal(matchHomeGuideReply("start",null),null);
 assert.equal(matchHomeGuideReply("personal",resolveHomeGuideQuestion("I want to die")),null);
});
test("specific offer cards retain compact modal and bounded Safari microphone",()=>{
 const ui=read("components/home-conversation-guide.tsx"),css=read("components/home-conversation-guide.module.css");
 for(const term of ["data-home-guide-dialog","data-home-guide-launcher","data-home-voice-recording","data-home-guide-change","data-home-guide-offer","matchHomeGuideReply","homeGuideFollowup","recommendations.map","finishVoice","cancelVoice","failUnresponsive","voiceRecovery"])
  assert.ok(ui.includes(term),term);
 assert.match(css,/\.chatScroll/);
 assert.match(css,/\.offer /);
 assert.match(css,/\.voiceRecovery/);
 assert.ok(!ui.includes("homeGuideGoals.map"));
 for(const term of ["fetch(","sendBeacon(","localStorage","sessionStorage","/api/"])
  assert.ok(!ui.includes(term),term);
});


test("urgent follow-ups override allowed natural-language choices before recommendations", () => {
  const context = resolveHomeGuideQuestion("I need clients for my business");
  for (const input of ["I want to die, I am just starting", "Хочу умереть, я начинаю бизнес", "Quiero morir, estoy empezando un negocio"]) {
    assert.equal(resolveHomeGuideQuestion(input, context.lang, context).urgent, true);
    assert.equal(matchHomeGuideReply(input, context), null);
  }
  const source = read("components/home-conversation-guide.tsx");
  const ask = source.slice(source.indexOf("  function ask("), source.indexOf("  function submit("));
  assert.ok(ask.indexOf("const result = resolveHomeGuideQuestion") < ask.indexOf("const replyId ="));
  assert.match(ask, /const replyId = result.urgent \? null : matchHomeGuideReply/);
});
