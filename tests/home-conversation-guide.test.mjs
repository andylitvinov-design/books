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
    'followup.choices.map',
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
  assert.match(css, /\.quickChoices \{ display: grid; grid-template-columns: repeat\(3,/);
  assert.match(css, /ideas-pine-reference\.webp/);
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(component, /data-guide-phase=\{turns\.length === 0/);
  assert.match(component, /className=\{styles\.inputRow\}/);
  assert.doesNotMatch(component, />\{t\.welcome\}<\/p>/, "hide redundant welcome speech bubble");
  assert.match(css, /\.form textarea \{[^}]*resize: none/);
  assert.match(css, /\.recordingDot \{ animation: none;/);
  for (const forbidden of ["MediaRecorder", "getUserMedia(", "fetch(", "localStorage", "sessionStorage"]) {
    assert.ok(!component.includes(forbidden), "Speech-to-text should not save raw audio or send private text: " + forbidden);
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

test("homepage provides the single canonical free Reiki start without changing the carousel", () => {
  const component = read("components/home-conversation-guide.tsx");
  assert.ok(component.includes("data-home-guide-reiki-entry"));
  assert.ok(component.includes("!context?.urgent ? <div className={styles.reikiEntry}"), "Static course promotion must also disappear in crisis");
  assert.ok(component.includes("href={REIKI_FREE_COURSE_PATH}"));
  assert.ok(component.includes("Curso en inglés"));
  assert.ok(component.includes("Курс откроется на английском"));
  assert.ok(component.includes("Начать курс на английском"));
  assert.doesNotMatch(component, /€39|Buy now|Купить сейчас/);
});

test("product routing preserves latest voice lifecycle and initial three-choice layout", () => {
  const component = read("components/home-conversation-guide.tsx");
  assert.ok(component.indexOf("data-home-guide-reiki-entry") > component.indexOf("className={styles.quickChoices}"), "Secondary course entry must not displace the approved hero or composer");
  for (const token of ["voiceGenerationRef.current += 1", "elapsed >= 60", "}, 12000)", "}, 2500)", "voiceDiscardRef.current = true", "submitOnEndRef.current = false"]) assert.ok(component.includes(token), token);
});


test("spoken and typed answers use only the currently permitted contextual choices", () => {
  const business = resolveHomeGuideQuestion("I need clients for my business");
  assert.equal(matchHomeGuideReply("I'm just starting", business), "work-start");
  assert.equal(matchHomeGuideReply("I already have customers", business), "work-grow");
  assert.equal(matchHomeGuideReply("Я развиваю карьеру", business), "work-career");
  assert.equal(matchHomeGuideReply("something different", business), null);
  assert.equal(matchHomeGuideReply("I'd like a consultation", business), "personal");
  const stress = resolveHomeGuideQuestion("Постоянная тревога");
  assert.equal(matchHomeGuideReply("Хочу попробовать практику", stress), "calm-practice");
  assert.equal(matchHomeGuideReply("Пройду тест", stress), "self-check");
  assert.equal(matchHomeGuideReply("I want to grow my business", stress), null);
  const unknown = resolveHomeGuideQuestion("Something complicated");
  assert.equal(matchHomeGuideReply("Quiero negocio", unknown), "topic-work");
  assert.equal(matchHomeGuideReply("new project", null), null);
  assert.equal(matchHomeGuideReply("personal", resolveHomeGuideQuestion("I want to die")), null);
  const ui = read("components/home-conversation-guide.tsx");
  assert.match(ui, /data-home-guide-change/);
  assert.match(ui, /matchHomeGuideReply\(question, context\)/);
  assert.match(ui, /logRef\.current\?\.scrollTo/);
});
