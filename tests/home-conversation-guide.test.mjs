import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { homeGuideDestinations, homeGuideGoals, homeGuideCategories, browseHomeGuideOffers, homeGuideQuickStarts, resolveHomeGuideQuestion, homeGuideFollowup, chooseHomeGuideOffer, matchHomeGuideReply, homeGuideOpening, homeGuideConversationCue, homeGuideFreeTextStep } from "../lib/home-conversation.mjs";

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

test("the in-place consultant category filter reuses real offers, priorities and safe paths", () => {
  assert.deepEqual(homeGuideCategories, ["all", "services", "courses", "tests", "free"]);
  for (const locale of ["en", "ru", "es"]) {
    for (const category of homeGuideCategories) {
      const result = browseHomeGuideOffers({ category, locale, question: "Need help growing my business" });
      assert.equal(result.urgent, false);
      assert.ok(result.offers.length >= 1 && result.offers.length <= 3);
      assert.equal(new Set(result.offers.map(offer => offer.id)).size, result.offers.length);
      for (const offer of result.offers) {
        assert.match(offer.href, new RegExp("^/(en|ru|es)/"));
        assert.ok(!offer.href.includes("?"));
        assert.ok(!offer.href.includes("business%20") && !offer.href.includes("Need"));
        assert.equal(offer.checkoutStatus, "not_verified");
      }
    }
    const tests = browseHomeGuideOffers({ category: "tests", locale, question: "Estoy muy ansiosa" }).offers;
    assert.deepEqual(tests.map(x => x.id), ["tests"]);
    const classes = browseHomeGuideOffers({ category: "courses", locale, question: "I want to learn Reiki" }).offers;
    assert.equal(classes[0].id, "reiki");
    const relationships = browseHomeGuideOffers({ category: "services", locale, question: "Problems with my partner" }).offers;
    assert.equal(relationships[0].id, "review");
    assert.ok(relationships.some(o => o.id === "alchemy"));
    const work = browseHomeGuideOffers({ category: "all", locale, question: "Need clients for my business" }).offers;
    assert.equal(work[0].id, "business");
    assert.ok(browseHomeGuideOffers({ category: "free", locale }).offers.every(o => o.id !== "consult"));
    const emergency = browseHomeGuideOffers({ category: "services", locale, question: "I want to kill myself" });
    assert.equal(emergency.urgent, true);
    assert.deepEqual(emergency.offers, []);
  }
  assert.deepEqual(browseHomeGuideOffers({ category: "invalid", locale: "en" }).offers, []);
});

test("six first-screen requests link to existing destinations with explicit site categories EN/RU/ES", () => {
  const expected = {
    stress: "/en/courses/antistress",
    relationships: "/en/services/free-situation-review",
    direction: "/en/books",
    business: "/en/app/business",
    resources: "/en/services/dao-health-profile",
    reiki: "/en/academy/reiki/free-practitioner-course",
  };
  for (const locale of ["en", "ru", "es"]) {
    const cards = homeGuideQuickStarts(locale);
    assert.equal(cards.length, 6);
    assert.deepEqual(cards.map(card => card.id), Object.keys(expected));
    assert.equal(new Set(cards.map(card => card.id)).size, 6);
    for (const card of cards) {
      const path = card.id === "business"
        ? (locale === "ru" ? "/ru/app/business" : "/en/app/business")
        : expected[card.id].replace(/^\/en\//, "/" + locale + "/");
      assert.equal(card.href, path, locale + " " + card.id);
      assert.ok(card.category.length > 3 && card.title.length > 3);
      assert.doesNotMatch(card.href, /[?&]|question=|prompt=/);
    }
  }
  assert.equal(homeGuideQuickStarts("es").find(card => card.id === "business").href, "/en/app/business");
  assert.equal(homeGuideQuickStarts("ru").find(card => card.id === "relationships").category.startsWith("Услуги"), true);
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

test("EN/RU/ES offer on-demand guidance in the early topic picker without duplicating the seven stages", () => {
  const en = read("components/holistic-house-home.tsx");
  const es = read("app/es/page.tsx");
  const more = read("components/home-more-disclosure.tsx");
  for (const page of [en,es]) {
    // The early topic picker precedes the seven-stage workspace, not a repeated lower grid.
    const sections = ["HomeSectionCarousel", "HomeMoreDisclosure", "HomeFeaturedWorkspace"];
    for (const name of sections) {
      assert.equal((page.match(new RegExp("<" + name + "\\b", "g")) || []).length, 1, name);
    }
    assert.ok(page.indexOf("<HomeSectionCarousel") < page.indexOf("<HomeMoreDisclosure"));
    assert.ok(page.indexOf("<HomeMoreDisclosure") < page.indexOf("<HomeFeaturedWorkspace"));
    assert.doesNotMatch(page, /<HomeConversationGuide locale=/);
  }
  assert.match(more, /const HomeConversationGuide = dynamic\([\s\S]*?import\("\.\/home-conversation-guide"\)[\s\S]*?ssr: false/);
  assert.match(more, /const \[expanded, setExpanded\] = useState\(false\)/);
  assert.match(more, /<details[\s\S]*?onToggle=\{event => setExpanded\(event\.currentTarget\.open\)\}/);
  assert.match(more, /<summary>/);
  assert.match(more, /\{expanded \? <HomeConversationGuide locale=\{locale\} \/> : null\}/);
  assert.ok(read("app/[locale]/page.tsx").includes("<HolisticHouseHome"));
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
    'suggestedChoices.slice(0, 3).map',
    "appendExchange",
    "new Speech()",
    "engine.start()",
    "SpeechRecognition",
    "try { engine.stop(); }",
    "safety.urgent",
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
  assert.match(css, /\.needGrid\s*\{[^}]*grid-template-columns: repeat\(3,/);
  assert.match(css, /ideas-pine-reference\.webp/);
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(component, /data-guide-phase=\{turns\.length === 0/);
  assert.match(component, /className=\{styles\.inputRow\}/);
  assert.match(component, /role="dialog" aria-modal="true"/, "conversation lives in a dialog");
  assert.match(component, /data-home-guide-launcher/, "homepage retains a full-width guidance CTA");
  assert.match(component, /data-home-guide-launcher-mic/, "one-tap microphone opens the dialog");
  assert.match(component, /suggestedChoices.slice/, "only topic-matched choices are shown");
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
  ["I have a conflict with my partner", "conflict-arguments", "review"],
  ["Сложные отношения с партнёром", "conflict-arguments", "review"],
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
  const clarified = chooseHomeGuideOffer(unknown, "topic-business");
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
 assert.equal(matchHomeGuideReply("Quiero negocio",resolveHomeGuideQuestion("Something confusing")),"topic-business");
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

test("first-screen lists direct category needs while only the separate chat opens the composer", () => {
  const component = read("components/home-conversation-guide.tsx");
  const css = read("components/home-conversation-guide.module.css");
  for (const token of ["homeGuideQuickStarts(locale).map", "data-home-guide-needs",
    "data-home-guide-need={item.id}", "className={styles.chatLauncher} data-home-guide-launcher",
    "className={styles.chatMic} data-home-guide-launcher-mic", "aria-modal=\"true\"",
    "t.privacyDetail", "recommendations.map"])
    assert.ok(component.includes(token), token);
  assert.ok(!component.includes("home-guide-entry-question"), "Composer exists only in the chat sheet");
  assert.ok(!component.includes("data-home-guide-filters"), "Category scroller removed from first screen");
  assert.ok(!component.includes("data-home-guide-inline-results"), "Offer tiles no longer stretch the first screen");
  assert.match(css, /\.needGrid\s*\{[^}]*grid-template-columns: repeat\(3,/);
  assert.match(css, /\.needGrid\s*\{[^}]*grid-template-columns: repeat\(2,/);
  assert.match(css, /\.needCard\s*\{[^}]*min-height: 75px/);
  assert.match(css, /\.chatLauncher\s*\{[^}]*min-height: 48px/);
  assert.match(css, /ideas-pine-reference\.webp/);
});

test("Ideas visual parity: Home reuses pine, ivory masthead, warm action and featured topic without changing the private chat", () => {
  const home = read("components/holistic-house-home.tsx");
  const guide = read("components/home-conversation-guide.tsx");
  const css = read("components/home-conversation-guide.module.css");
  const headerCss = read("app/holistic-house-home.css");
  assert.match(home, /<SiteNavigation locale=\{locale\} \/>/);
  assert.match(read("components/home-more-disclosure.tsx"), /<HomeConversationGuide locale=\{locale\} \/>/);
  assert.match(css, /ideas-pine-reference\.webp/, "Keep the approved local pine artwork");
  assert.match(css, /\.needCard:first-child \{/, "Featured topic visually mirrors Ideas but is not selected");
  assert.match(css, /#dcf1ed/, "First tile uses the evergreen Ideas accent");
  assert.match(css, /\.chatMic \{[\s\S]*?min-height: 48px;/);
  assert.match(css, /\.chatLauncher \{[\s\S]*?#af805d/, "Warm CTA matches approved Ideas");
  assert.match(headerCss, /\.house-home--services > \.house-header--services \{[\s\S]*?background: #fffdf9;/);
  for (const token of ["data-home-guide-launcher-mic", "data-home-guide-dialog", "SpeechRecognition", "aria-modal=\"true\""]) {
    assert.ok(guide.includes(token), "Existing guide behavior must remain: " + token);
  }
});

test("home advisor stays optional and is not repeated as a second conversion funnel", () => {
  const en = read("components/holistic-house-home.tsx");
  const es = read("app/es/page.tsx");
  const more = read("components/home-more-disclosure.tsx");
  for (const source of [en,es]) {
    assert.match(source, /<HomeMoreDisclosure locale=/);
    assert.doesNotMatch(source, /<HomeConversationGuide locale=/);
  }
  assert.match(more, /data-home-more-deferred="true"/);
  assert.match(more, /dynamic\(/);
  const guide = read("components/home-conversation-guide.tsx");
  for (const token of ["data-home-guide-needs","data-home-guide-need={item.id}",
    "data-home-guide-launcher","styles.advisorPortrait","homeGuideQuickStarts"])
    assert.ok(guide.includes(token));
});

test("a wish for love gets two genuine context questions before any sales suggestion", () => {
  const love = resolveHomeGuideQuestion("Хочу любви", "en");
  assert.equal(love.lang, "ru");
  assert.equal(love.topic, "relationships");
  assert.equal(love.subtopic, null);
  assert.match(homeGuideOpening(love).ru, /любви и близости/);
  const initial = homeGuideFollowup(love);
  assert.match(initial.prompt.ru, /встретить близкого человека/);
  assert.deepEqual(initial.choices.slice(0, 3).map(c => c.id), ["focus-meeting", "focus-bond", "focus-patterns"]);
  assert.equal(chooseHomeGuideOffer(love, "written-review"), null, "No premature format selection");

  const meeting = chooseHomeGuideOffer(love, "focus-meeting", "ru");
  assert.deepEqual(meeting.offers, [], "First answer is another clarification, not a purchase");
  assert.equal(meeting.context.subtopic, "meeting");
  assert.match(homeGuideFollowup(meeting.context).prompt.ru, /знакомиться, начинать разговор/);
  assert.equal(chooseHomeGuideOffer(meeting.context, "written-review"), null);
  const firstStep = chooseHomeGuideOffer(meeting.context, "meeting-conversation", "ru");
  assert.deepEqual(firstStep.offers.map(x => x.id), ["review", "tests"]);
  assert.equal(firstStep.offers[0].href, "/ru/services/free-situation-review");
  assert.doesNotMatch(firstStep.offers[0].href, /любви|Хочу|question|[?&]/);
  assert.equal(firstStep.offers[0].checkoutStatus, "not_verified");
});

test("relationships cover specific difficulties with natural typed replies EN/RU/ES", () => {
  for (const [text, locale] of [["I want love", "en"], ["Хочу любви", "ru"], ["Quiero amor", "es"]]) {
    const initial = resolveHomeGuideQuestion(text, locale);
    assert.equal(initial.topic, "relationships");
    assert.ok(homeGuideOpening(initial)[locale].length > 20);
    for (const [focus, expectedChoices] of [
      ["focus-meeting", ["meeting-people", "meeting-conversation", "meeting-closeness"]],
      ["focus-bond", ["bond-talk", "bond-trust", "bond-warmth"]],
      ["focus-patterns", ["patterns-repeat", "patterns-choice", "personal"]],
    ]) {
      const next = chooseHomeGuideOffer(initial, focus, locale);
      assert.deepEqual(next.offers, []);
      const followup = homeGuideFollowup(next.context);
      assert.deepEqual(followup.choices.map(c => c.id), [...expectedChoices, ...(focus === "focus-patterns" ? [] : ["personal"])]);
      assert.ok(followup.prompt[locale].length > 20);
      for (const choice of followup.choices) {
        const result = chooseHomeGuideOffer(next.context, choice.id, locale);
        assert.ok(result);
        assert.ok(result.offers.length <= 2);
        assert.ok(result.offers.every(offer => /^\/(en|ru|es)\//.test(offer.href)));
      }
    }
  }
  const love = resolveHomeGuideQuestion("Хочу любви", "ru");
  assert.equal(matchHomeGuideReply("Хочу познакомиться", love), "focus-meeting");
  assert.equal(matchHomeGuideReply("Хочу сблизиться с партнёром", love), "focus-bond");
  assert.equal(matchHomeGuideReply("Что мешает мне?", love), "focus-patterns");
  assert.equal(matchHomeGuideReply("Мне нужен мастер", love), "personal");
  const meeting = chooseHomeGuideOffer(love, "focus-meeting").context;
  assert.equal(matchHomeGuideReply("Хочу знакомиться", meeting), "meeting-people");
  assert.equal(matchHomeGuideReply("Боюсь первой написать", meeting), "meeting-conversation");
  assert.equal(matchHomeGuideReply("Мне трудно доверять", meeting), "meeting-closeness");
  assert.equal(matchHomeGuideReply("No sé", meeting), null);
  assert.equal(chooseHomeGuideOffer(love, "meeting-closeness"), null, "No skipping the question");
  assert.equal(chooseHomeGuideOffer(meeting, "javascript:alert(1)"), null);
});

test("conflict, anxiety, sleep and business have distinct prompts without inventing therapies", () => {
  const conflict = resolveHomeGuideQuestion("Ссоримся с партнёром", "ru");
  assert.equal(conflict.subtopic, "conflict");
  assert.match(homeGuideFollowup(conflict).prompt.ru, /ссоры/);
  assert.equal(chooseHomeGuideOffer(conflict, "conflict-arguments").offers[0].id, "review");

  const lonely = resolveHomeGuideQuestion("Мне одиноко", "ru");
  assert.equal(lonely.subtopic, "lonely");
  assert.match(homeGuideFollowup(lonely).prompt.ru, /общения/);
  assert.equal(chooseHomeGuideOffer(lonely, "lonely-contact").offers[0].id, "review");

  const worry = resolveHomeGuideQuestion("Постоянная тревога", "ru");
  assert.equal(worry.subtopic, "anxiety");
  assert.match(homeGuideFollowup(worry).prompt.ru, /тревогу/);
  assert.equal(chooseHomeGuideOffer(worry, "calm-practice").offers[0].id, "antistress");

  const sleep = resolveHomeGuideQuestion("Стресс и плохо сплю", "ru");
  assert.equal(sleep.subtopic, "sleep");
  assert.match(homeGuideFollowup(sleep).prompt.ru, /сон/);

  const clients = resolveHomeGuideQuestion("I need clients for my business");
  assert.equal(clients.subtopic, "clients");
  assert.match(homeGuideOpening(clients).en, /clients/);
  assert.match(homeGuideFollowup(clients).prompt.en, /clients/);
  assert.equal(chooseHomeGuideOffer(clients, "work-grow").offers[0].id, "business");
});

test("conversational courtesy preserves topic and offers; new explicit subject takes over", () => {
  const love = resolveHomeGuideQuestion("Хочу любви", "ru");
  const next = chooseHomeGuideOffer(love, "focus-bond").context;
  assert.equal(homeGuideConversationCue("Спасибо", next).kind, "thanks");
  assert.equal(homeGuideConversationCue("Не знаю", next).kind, "unsure");
  assert.equal(homeGuideConversationCue("Можно бесплатно?", next).kind, "free");
  assert.equal(homeGuideConversationCue("А сколько стоит?", next).kind, "price");
  assert.equal(homeGuideConversationCue("Другие варианты", next).kind, "alternatives");
  assert.match(homeGuideConversationCue("Можно бесплатно?", next).response.ru, /бесплатные тесты/);
  assert.match(homeGuideConversationCue("А сколько стоит?", next).response.ru, /€50/);
  assert.equal(homeGuideConversationCue("Это беспокоит меня уже полгода", next), null);

  // "I'm scared to get closer" remains a reply about love, but an explicit
  // new question about business must replace the old topic.
  const related = resolveHomeGuideQuestion("Мне страшно открываться", "ru", next);
  assert.equal(related.topic, "relationships");
  assert.equal(related.subtopic, "bond");
  const other = resolveHomeGuideQuestion("Теперь хочу развивать бизнес", "ru", next);
  assert.equal(other.topic, "work");
  assert.equal(other.subtopic, null);
  assert.equal(matchHomeGuideReply("неизвестный вариант", next), null);
});

test("urgent crisis suppresses promotions, including after a normal conversation", () => {
  const love = resolveHomeGuideQuestion("Хочу любви", "ru");
  const urgent = resolveHomeGuideQuestion("Я хочу покончить с собой", "ru", love);
  assert.equal(urgent.urgent, true);
  assert.equal(homeGuideFollowup(urgent), null);
  assert.equal(homeGuideConversationCue("спасибо", urgent), null);
  assert.equal(chooseHomeGuideOffer(urgent, "personal"), null);
  assert.equal(resolveHomeGuideQuestion("Нужен бесплатный тест", "ru", urgent).urgent, true);
});


test("open-ended text after a second question is heard without endless repetition", () => {
  const love = resolveHomeGuideQuestion("Хочу любви", "ru");
  assert.equal(homeGuideFreeTextStep("Я давно никому не нужна и мне от этого грустно", love, "ru"), null,
    "Do not skip the first clarifying question");
  const next = chooseHomeGuideOffer(love, "focus-meeting", "ru").context;
  assert.equal(homeGuideFreeTextStep("не знаю", next, "ru"), null);
  const result = homeGuideFreeTextStep("Мне кажется, меня никто не замечает, даже когда я пытаюсь общаться", next, "ru");
  assert.ok(result);
  assert.deepEqual(result.offers.map(x => x.id), ["review", "tests"]);
  assert.match(result.response.ru, /не могу понять все нюансы/);
  assert.equal(result.offers[0].href, "/ru/services/free-situation-review");
  assert.doesNotMatch(result.offers[0].href, /никто|замечает|[?&]/);
  const other = chooseHomeGuideOffer(next, "personal", "ru");
  assert.equal(other.offers[0].id, "consult", "Personal service remains opt-in");
  const urgent = resolveHomeGuideQuestion("Хочу умереть", "ru", next);
  assert.equal(homeGuideFreeTextStep("Спасибо, что ответили", urgent, "ru"), null);
});

test("natural language category correction for relationships, sleep, money and Spanish", () => {
  const boyfriend = resolveHomeGuideQuestion("Боюсь потерять парня", "en");
  assert.equal(boyfriend.lang, "ru");
  assert.equal(boyfriend.topic, "relationships");
  assert.equal(boyfriend.subtopic, "bond");
  const sleepless = resolveHomeGuideQuestion("У меня бессонница", "ru");
  assert.equal(sleepless.topic, "stress");
  assert.equal(sleepless.subtopic, "sleep");
  const money = resolveHomeGuideQuestion("Хочу больше денег", "ru");
  assert.equal(money.topic, "work");
  assert.equal(money.subtopic, "income");
  assert.match(homeGuideFollowup(money).prompt.ru, /увеличить доход/);
  const spanish = resolveHomeGuideQuestion("Quiero amor", "en");
  assert.equal(spanish.lang, "es", "A brief natural Spanish sentence should not use English on EN home");
  assert.equal(spanish.topic, "relationships");
});

test("mobile chat uses gentle suggestion chips and context-first privacy-safe dialogue", () => {
  const ui = read("components/home-conversation-guide.tsx");
  const css = read("components/home-conversation-guide.module.css");
  const router = read("lib/home-conversation.mjs");
  assert.ok(ui.includes("homeGuideConversationCue(question, context)"));
  assert.ok(ui.includes("homeGuideFreeTextStep(question, context, safety.lang)"));
  assert.ok(ui.includes("const safety = resolveHomeGuideQuestion"));
  assert.ok(ui.indexOf("if (safety.urgent)") < ui.indexOf("const replyId = matchHomeGuideReply"));
  assert.ok(ui.includes("const sameConversation = context"));
  assert.ok(ui.includes("const t = copy[context?.lang ?? locale]"));
  assert.ok(ui.includes("homeGuideOpening(result)[result.lang]"));
  assert.ok(ui.includes("<p className={styles.choiceCaption}>{answerCopy.choiceHint}</p>"));
  assert.ok(ui.includes('choiceHint: "Можно просто ответить'));
  assert.ok(ui.includes('choiceHint: "You can reply in your own words'));
  assert.ok(ui.includes('choiceHint: "También puedes responder'));
  assert.match(css, /\.choices \{ display: flex; flex-wrap: wrap;/);
  assert.match(css, /\.choice \{[\s\S]*?min-height: 44px;/);
  assert.match(css, /\.choice \{[\s\S]*?border-radius: 22px;/);
  assert.ok(!ui.includes("{choice.label[context.lang]}<ArrowRight"));
  for (const forbidden of ["fetch(", "sendBeacon(", "localStorage", "sessionStorage", "/api/"]) {
    assert.ok(!ui.includes(forbidden), forbidden);
    assert.ok(!router.includes(forbidden), forbidden);
  }
});


test("unrecognized queries ask for a site category without offering paid help", () => {
  const unknown = resolveHomeGuideQuestion("Could you explain this unknown phrase?", "en");
  assert.equal(unknown.matched, false);
  const clarification = homeGuideFollowup(unknown);
  assert.match(clarification.prompt.en, /may have missed/);
  assert.deepEqual(clarification.choices.map(x => x.id),
    ["topic-love","topic-energy","topic-business","topic-courses","topic-site","other-help"]);
  for (const [id,topic,interest] of [
    ["topic-love","relationships",null],["topic-energy","resources",null],
    ["topic-business","work",null],["topic-courses","direction","courses"],
    ["topic-site","direction","site"]
  ]) {
    const chosen = chooseHomeGuideOffer(unknown,id);
    assert.equal(chosen.context.topic,topic);
    assert.equal(chosen.context.interest,interest);
    assert.deepEqual(chosen.offers,[]);
    assert.ok(homeGuideFollowup(chosen.context).prompt.en.length > 15);
  }
  const contact=chooseHomeGuideOffer(unknown,"other-help");
  assert.equal(contact.offers[0].id,"contact");
  assert.equal(contact.offers[0].href,"/en/contact");
  assert.equal(chooseHomeGuideOffer(unknown,"site-account"),null);
  assert.equal(matchHomeGuideReply("My account",unknown),"topic-site");
  assert.equal(matchHomeGuideReply("I want a course",unknown),"topic-courses");
});

test("site and course questions lead to specific existing pages", () => {
  for (const locale of ["en","ru","es"]) {
    const question = {en:"I cannot log in to my account",ru:"Не могу войти в кабинет",es:"No puedo iniciar sesión en mi cuenta"}[locale];
    const context=resolveHomeGuideQuestion(question,locale);
    assert.equal(context.interest,"site",question);
    const offer=chooseHomeGuideOffer(context,"site-account",locale);
    assert.equal(offer.offers[0].href,"/"+locale+"/app");
    assert.equal(offer.offers[0].checkoutStatus,"not_verified");
    const contact=chooseHomeGuideOffer(context,"site-contact",locale);
    assert.equal(contact.offers[0].href,"/"+locale+"/contact");
  }
  for(const [text,locale] of [["Where are the courses?","en"],["Хочу пройти курс","ru"],["Quiero aprender en un curso","es"]]) {
    const context=resolveHomeGuideQuestion(text,locale);
    assert.equal(context.interest,"courses",text);
    assert.equal(chooseHomeGuideOffer(context,"reiki-course",locale).offers[0].id,"reiki");
    assert.equal(chooseHomeGuideOffer(context,"calm-practice",locale).offers[0].id,"antistress");
    assert.equal(chooseHomeGuideOffer(context,"work-grow",locale).offers[0].id,"business");
  }
});
