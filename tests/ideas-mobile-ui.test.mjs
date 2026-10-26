import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { diagnosisFixture } from "./helpers/diagnosis-parent-fixture.mjs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

function assertDaoDetailsTarget(ui, intro, offers) {
  assert.match(ui, /href=\{"\/" \+ locale \+ "\/services\/free-consultation#free-diagnosis-options"\} prefetch=\{false\}/);
  assert.doesNotMatch(ui, /\/services\/free-consultation#intro-request/);
  assert.match(intro, /<FreeDiagnosisOffers locale=\{lang\} \/>/);
  assert.equal([...intro.matchAll(/<FreeDiagnosisOffers\b/g)].length, 1, "Exactly one actual hub mount");
  // The canonical consultation hub anchors its heading inside the localized
  // full-mode section. Execute that actual parent: a literal anywhere is not proof.
  for (const locale of ["en", "ru", "es"]) {
    const f = diagnosisFixture({locale, parentSource: offers, pathname: "/" + locale + "/services/free-consultation"});
    try {
      const sections = f.nodes().filter(n => n.type === "section" && Object.hasOwn(n.props, "data-free-diagnosis-options"));
      assert.equal(sections.length, 1, "One actual consultation offer section");
      const section = sections[0];
      assert.equal(section.props.lang, locale);
      assert.equal(section.props["data-free-diagnosis-layout"], "full", "The default hub is full mode");
      assert.equal(section.hidden, false);
      const targets = f.nodes().filter(n => n.props.id === "free-diagnosis-options");
      assert.equal(targets.length, 1, "Exactly one fragment target");
      assert.equal(targets[0].type, "header", "Fragment lands at the offer heading");
      assert.equal(targets[0].hidden, false, "Fragment target is visible before interaction");
      function contains(node, target) {
        if (Array.isArray(node)) return node.some(child => contains(child, target));
        if (!node || typeof node !== "object") return false;
        return node.element === target.element || contains(node.props?.children, target);
      }
      assert.ok(contains(section, targets[0]), "Target belongs to the actual offer section");
      const headings = f.nodes().filter(n => n.type === "h2" && n.props.id === section.props["aria-labelledby"]);
      assert.equal(headings.length, 1);
      assert.ok(contains(targets[0], headings[0]), "Target contains the section's accessible heading");
    } finally { f.unmount(); }
  }
}

test("Tests & Coaching first screen offers four paths, with original private Dao panel preserved on demand", () => {
  const ui = read("components/ideas-discovery.tsx");
  const css = read("components/ideas-discovery.module.css");
  const hub = read("components/tests-coaching-switchboard.tsx");
  assert.match(ui, /<TestsCoachingSwitchboard locale=\{locale\} templeContent=/);
  for (const path of ["profile", "temple", "coaching", "support"]) assert.ok(hub.includes("data-tests-coaching-path={key}"), path);
  assert.match(hub, /const pathOrder: Path\[\] = \["profile", "temple", "coaching", "support"\]/);
  assert.match(ui, /<form id="ideas-question-form" className=\{styles\.question\} onSubmit=\{submitQuestion\}>/);
  assert.match(ui, /<button type="submit" form="ideas-question-form" className=\{styles\.testButton\} data-ideas-tao>/);
  assert.match(ui, /<nav className=\{styles\.exploreLinks\} aria-label=\{t\.exploreMore\} data-ideas-explore>/);
  assert.match(ui, /<Link href=\{coachingHref\} prefetch=\{false\} className=\{styles\.exploreLink\}/);
  assert.match(ui, /data-ideas-explore-coaching/);
  assert.match(ui, /<a href="#temple-insights"/);
  assert.match(ui, /data-ideas-explore-temple/);
  assert.match(ui, /<h2 id="temple-insights" className=\{styles\.templeHeading\}>/);
  for (const label of ["Explore Coaching Options", "Explore Temple Insights", "Выбрать коучинг", "Исследовать храмовые подсказки", "Explorar opciones de coaching", "Explorar reflexiones del templo"]) {
    assert.ok(ui.includes(label), "Localized CTA missing: " + label);
  }
  assert.doesNotMatch(ui, /styles\.actionLabel|styles\.actions|aria-pressed=\{activeMode\}/);
  assert.match(css, /\.exploreLinks\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.exploreLink\{[\s\S]*?min-height:76px/);
  assert.match(css, /\.exploreIcon\{/);
  assert.match(css, /\.exploreCopy strong\{/);
  assert.match(css, /font-variant-emoji:text/);
  assert.match(css, /@media\(max-width:760px\)[\s\S]*?\.exploreLink\{[\s\S]*?min-height:80px/);
  assert.ok(ui.indexOf("data-ideas-explore>") < ui.indexOf("data-ideas-hero-utility"),
    "Explore cards appear before privacy and free-test utility text");
  assert.match(ui, /t\.taoOverline/);
  assert.match(ui, /<Compass size=\{18\} \/>/);
  assert.match(ui, /<BookOpen size=\{18\} \/>/);
  assert.match(css, /\.templeHeading\{[\s\S]*?scroll-margin-top:95px/);
  assert.match(css, /@media\(max-width:360px\)/);
  assert.match(css, /\.question textarea \{ min-height: 47px;[\s\S]*?font-size: 16px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});


test("asking a question reveals only a Daoist paragraph and Expand all; full 64-card texts load on demand", () => {
  const ui = read("components/ideas-discovery.tsx");
  const css = read("components/ideas-discovery.module.css");
  assert.match(ui, /function submitQuestion\(event: FormEvent<HTMLFormElement>\)[\s\S]*?choose\("dao"\)/);
  assert.match(ui, /<p className=\{styles\.daoSummary\} data-ideas-dao-summary>/);
  assert.match(ui, /<button type="button" className=\{styles\.expandDao\}/);
  assert.match(ui, /aria-expanded=\{expandedDao\} aria-controls="ideas-dao-details"/);
  assert.match(ui, /hidden=\{!expandedDao\}/);
  assert.match(ui, /data-ideas-dao-expanded/);
  assert.match(ui, /await import\("@\/data\/dao-hexagram-author\.json"\)/);
  assert.match(ui, /await import\("@\/data\/dao-hexagrams-editorial\.mjs"\)/);
  assert.match(ui, /expandDao: "Развернуть всё"/);
  assert.match(ui, /expandDao: "Expand all"/);
  assert.match(ui, /expandDao: "Desplegar todo"/);
  assert.match(css, /\.daoSummary \{/);
  assert.match(css, /\.expandDao \{[\s\S]*?min-height: 44px/);
  assert.match(css, /\.daoDetails \{/);
  assert.match(css, /\.daoProse \{/);
});

test("expanded Dao interpretation has no redundant read or draw-another actions in RU/EN/ES", () => {
  const ui = read("components/ideas-discovery.tsx");
  const css = read("components/ideas-discovery.module.css");
  assert.match(ui, /<div className=\{styles\.daoReading\} data-ideas-dao-reading>/);
  assert.match(ui, /<DaoOfferCards locale=\{answerLocale\}/);
  assert.doesNotMatch(ui, /answerCopy\.(?:card|again)|styles\.hexagramActions|RefreshCw/);
  assert.doesNotMatch(ui, /Прочитать толкование|Другой символ|Read interpretation|Draw another|Leer interpretación|Otro símbolo/);
  assert.doesNotMatch(css, /\.hexagramActions/);
});

test("first screen shows an explicitly marked educational example, never a made-up personal answer", () => {
  const ui = read("components/ideas-discovery.tsx");
  assert.match(ui, /const exampleHexagram = getHexagram\(42\)/);
  assert.match(ui, /data-ideas-preview/);
  assert.match(ui, /previewNote: "Пример/);
  assert.match(ui, /previewNote: "A sample, not a response to you/);
  assert.match(ui, /previewNote: "Es un ejemplo/);
  assert.match(ui, /data-ideas-result=\{result\.mode\}/);
  assert.match(ui, /aria-live="polite"/);
  assert.match(ui, /maxLength=\{500\}/);
  assert.match(ui, /<details className=\{styles\.privacyDisclosure\}>/);
  for (const denied of ["fetch(", "sendBeacon(", "localStorage", "sessionStorage", "XMLHttpRequest"]) {
    assert.ok(!ui.includes(denied), denied + " would compromise question privacy");
  }
});

test("local illustrated hero and original books/news/film feed remain available in all locales", () => {
  const css = read("components/ideas-discovery.module.css");
  const svg = read("public/images/holistic-house/ideas-zen-landscape.svg");
  const catalog = read("components/book-catalog.tsx");
  const spanish = read("app/es/books/page.tsx");
  const localized = read("app/[locale]/books/page.tsx");
  assert.match(css, /url\("\/images\/holistic-house\/ideas-zen-landscape\.svg"\)/);
  assert.match(svg, /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.ok(!svg.includes("<script"));
  assert.ok(!svg.includes("http://fonts"));
  assert.match(catalog, /<IdeasDiscovery locale=\{locale\}/);
  assert.match(spanish, /<IdeasDiscovery locale="es"/);
  assert.match(spanish, /<IdeasNewsFeed locale="es"/);
  assert.match(localized, /<IdeasNewsFeed locale=\{locale as Locale\}/);
});

test("Dao insight offers two localized cards with in-place consented enquiries and details links", () => {
  const ui = read("components/ideas-discovery.tsx");
  const css = read("components/ideas-discovery.module.css");
  const intro = read("app/[locale]/services/free-consultation/page.tsx");
  const offers = read("components/free-diagnosis-offers.tsx");
  const free = read("app/[locale]/services/free-situation-review/page.tsx");
  assert.match(ui, /data-ideas-dao-promos/);
  assert.match(ui, /result\.mode === "dao" && hexagram[\s\S]*?<DaoOfferCards locale=\{answerLocale\}[\s\S]*?result\.mode === "aphorisms"/);
  assert.match(ui, /t\.daoPromoReading\.title/);
  assert.match(ui, /t\.daoPromoGift\.title/);
  assertDaoDetailsTarget(ui, intro, offers);
  assert.match(ui, /\/services\/free-situation-review#request-free-review/);
  assert.match(free, /FreeEntryLanding locale=\{locale\} kind="situation"/);
  for (const text of ["Получите персональное даосское гадание", "Get a personal Daoist reading", "Recibe una lectura taoísta personal", "ПОДАРОК · БЕСПЛАТНО", "FREE GIFT", "REGALO · GRATIS"]) {
    assert.ok(ui.includes(text), "missing localized offer: " + text);
  }
  assert.match(css, /\.daoPromos \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.daoPromos \{ grid-template-columns: 1fr/);
  assert.match(css, /\.daoPromoAction \{[^}]*min-height: 44px/);
});

test("Dao details navigation rejects stale fragments, missing targets and detached offers", () => {
  const ui = read("components/ideas-discovery.tsx");
  const intro = read("app/[locale]/services/free-consultation/page.tsx");
  const offers = read("components/free-diagnosis-offers.tsx");
  assertDaoDetailsTarget(ui, intro, offers);
  for (const fragment of ["intro-request", "missing-offer"]) {
    const broken = ui.replace("/services/free-consultation#free-diagnosis-options", "/services/free-consultation#" + fragment);
    assert.notEqual(broken, ui);
    assert.throws(() => assertDaoDetailsTarget(broken, intro, offers), assert.AssertionError);
  }
  const missingTarget = offers.replace('id="free-diagnosis-options"', 'id="missing-offer"');
  assert.notEqual(missingTarget, offers);
  assert.throws(() => assertDaoDetailsTarget(ui, intro, missingTarget), assert.AssertionError);
  for (const changed of [
    offers.replace('id="free-diagnosis-options"', 'id="free-diagnosis-options" hidden'),
    offers.replace('id="free-diagnosis-options-title"', 'id="free-diagnosis-options"'),
    offers.replace('<header className={styles.heading}', '<div className={styles.heading}').replace('</header>', '</div>'),
  ]) {
    assert.notEqual(changed, offers);
    assert.throws(() => assertDaoDetailsTarget(ui, intro, changed), assert.AssertionError);
  }
  const detached = intro.replace("<FreeDiagnosisOffers locale={lang} />", "");
  assert.notEqual(detached, intro);
  assert.throws(() => assertDaoDetailsTarget(ui, detached, offers), assert.AssertionError);
});

test("approved image-based reference renders Dao, expandable meaning and three readable horizontal aphorism rows", () => {
  const ui = read("components/ideas-discovery.tsx");
  const css = read("components/ideas-discovery.module.css");
  const browser = read("scripts/verify-ideas-mobile-browser.mjs");
  for(const marker of ["data-ideas-dao-card", "data-ideas-aphorisms", "daoInterpretation", "daoGlyphCard", "daoPoint", "daoExpanded", "t.topicStep[topic]"]) {
    assert.ok(ui.includes(marker), marker + " missing in interactive component");
  }
  assert.match(ui, /<details className=\{styles\.daoExpanded\} open=\{example\}>/);
  assert.match(ui, /getIdeasAphorismMatches\(question, answerLocale, result\.topic\)/);
  assert.match(ui, /href=\{item\.source\.url\}/);
  assert.match(ui, /accept="\.txt,\.md,text\/plain,text\/markdown"/);
  assert.ok(!ui.includes("navigator.clipboard"), "question must not be copied implicitly");
  assert.match(css, /ideas-pine-reference\.webp/);
  assert.match(css, /\.aphorisms \{ display:grid; grid-template-columns:minmax\(0,1fr\)/);
  assert.doesNotMatch(css, /grid-auto-flow: column/);
  assert.match(css, /\.daoPoint p \{ font-size:12px/);
  assert.match(browser, /Ideas mobile browser acceptance passed/);
});


test("visual reference retains current Dao promos and verified historic proverbs", () => {
  const ui = read("components/ideas-discovery.tsx");
  const css = read("components/ideas-discovery.module.css");
  assert.match(ui, /data-ideas-dao-promos/);
  assert.match(ui, /item\.kind === "proverb" \? t\.proverbSource/);
  assert.match(ui, /item\.kind === "proverb" && item\.original/);
  assert.match(ui, /t\.daoPromoGift\.title/);
  assert.match(css, /\.relatedAphorisms \.aphorisms/);
});


test("Ideas sequences three full-width aphorisms, Dao, then offers in preview and real answer", () => {
  const ui = read("components/ideas-discovery.tsx");
  const css = read("components/ideas-discovery.module.css");
  const inlineForm = read("components/compact-lead-capture.tsx");
  const inlineCss = read("components/compact-lead-capture.module.css");
  const actual = ui.slice(ui.indexOf('data-ideas-result={result.mode}'), ui.indexOf('{result.mode === "aphorisms" ? (', ui.indexOf('data-ideas-result={result.mode}')));
  const preview = ui.slice(ui.indexOf('data-ideas-preview aria-label='));
  const isOrdered = (block, tokens) => tokens.map(token => block.indexOf(token))
    .every((index, n, positions) => index >= 0 && (n === 0 || positions[n - 1] < index));
  assert.ok(isOrdered(actual, [
    '<AphorismTiles items={aphorismMatches.slice(0, 3)}',
    '<div className={styles.daoQuick} data-ideas-dao>',
    '<DaoOfferCards locale={answerLocale}',
  ]), "actual results must show aphorism rows above Dao, then offers");
  assert.ok(isOrdered(preview, [
    '<AphorismTiles items={previewAphorisms}',
    '<DaoInsightPanel entry={exampleHexagram}',
    '<DaoOfferCards locale={locale}',
  ]), "educational preview must follow the same order");
  assert.match(css, /\.relatedAphorisms \.aphorisms \{ grid-template-columns:minmax\(0,1fr\); overflow:visible; \}/);
  assert.match(css, /\.root \.results\{padding:2px;border-radius:12px\}/);
  assert.match(css, /\.root \.relatedAphorisms\{padding:4px;border-radius:12px\}/);
  assert.match(css, /\.root \.aphorisms li\{width:100%;padding:10px 9px\}/);
  assert.match(css, /\.relatedAphorisms \+ \.daoQuick/);
  assert.match(ui, /data-ideas-order-button="reading"/);
  assert.match(ui, /data-ideas-order-button="gift"/);
  assert.match(ui, /aria-expanded=\{openOffer === "reading"\} aria-controls="ideas-offer-reading"/);
  assert.match(ui, /aria-expanded=\{openOffer === "gift"\} aria-controls="ideas-offer-gift"/);
  assert.match(ui, /<CompactLeadCapture locale=\{locale\} variant="inline" serviceTitle=\{t\.daoPromoReading\.title\}/);
  assert.match(ui, /<CompactLeadCapture locale=\{locale\} variant="inline" serviceTitle=\{t\.daoPromoGift\.title\}/);
  assert.match(inlineForm, /"\/api\/service-enquiries"/);
  assert.match(inlineForm, /contactConsent: true/);
  assert.match(inlineForm, /result\?\.saved !== true/);
  assert.match(inlineForm, /data-inline-offer-form/);
  assert.match(inlineCss, /\.section\.inline \{/);
  for (const key of ['order', 'requestTitle', 'requestLead', 'fullService']) {
    assert.equal(ui.split(key + ":").length - 1, 3, "EN/RU/ES copy: " + key);
  }
  assert.doesNotMatch(ui, /fetch\(/, "Ideas question must remain in-browser");
});


test("Ideas example rotates on client mount, keeping private question matching intact", () => {
  const ui = read("components/ideas-discovery.tsx");
  assert.match(ui, /data-ideas-preview-ready=\{previewReady \? "" : undefined\}/);
  assert.match(ui, /data-ideas-aphorism-id=\{item\.id\}/);
  assert.match(ui, /setPreviewAphorisms\(rotateIdeasPreviewAphorisms\(locale\)\)/);
  assert.match(ui, /getIdeasAphorismMatches\(question, answerLocale, result\.topic\)/);
});


test("Ideas has one compact photographic question banner and two choices immediately beneath", () => {
  const ui = read("components/ideas-discovery.tsx");
  const css = read("components/ideas-discovery.module.css");
  const catalog = read("data/assessments/catalog.js");
  assert.match(ui, /<div className=\{styles\.hero\} data-ideas-hero>[\s\S]*?<div className=\{styles\.heading\}>[\s\S]*?<form id="ideas-question-form" className=\{styles\.question\} onSubmit=\{submitQuestion\}>/);
  assert.match(ui, /<div className=\{styles\.heroActions\} data-ideas-hero-actions role="group" aria-label=\{isHolistic \? holisticIntro\[locale\]\.choose : t\.choose\}>/);
  assert.match(ui, /<Link href=\{coachingHref\} prefetch=\{false\} className=\{styles\.submit\}/);
  assert.ok(ui.includes("data-ideas-free-coaching"));
  assert.ok(ui.includes("data-ideas-free-test"));
  assert.match(ui, /aria-expanded=\{showSuggestedTests\} aria-controls="ideas-filtered-tests"/);
  assert.match(ui, /onPointerUp=\{event => \{ if \(event\.pointerType === "touch"\) openFreeTestsOnTouch\(\); \}\}/);
  assert.match(ui, /onClick=\{event => openFreeTestsOnClick\(event\.detail\)\}/);
  assert.match(ui, /detail > 0 && performance\.now\(\) - lastTouchFreeTestRef\.current < 650/);
  assert.match(css, /scroll-margin-block-end:calc\(116px \+ env\(safe-area-inset-bottom,0px\)\)/);
  assert.match(css, /touch-action:manipulation/);
  assert.match(ui, /data-ideas-test-start=\{key\}/);
  assert.match(ui, /client\?startTests=hh-current-state/);
  assert.match(catalog, /key: 'hh-current-state',[\s\S]*?startable: true,[\s\S]*?rightsStatus: 'cleared',[\s\S]*?guestEligible: true/);
  for (const label of ["Get free coaching session", "Пройти бесплатную коуч-сессию", "Sesión gratuita de coaching"]) assert.ok(ui.includes(label));
  assert.ok(ui.includes('const coachingHref = "/" + locale + "/coaching"'));
  assert.ok(ui.includes('testLink: "Or explore a free test"'));
  assert.match(css, /\.hero::before \{[\s\S]*?ideas-pine-sharp\.avif/);
  assert.match(css, /\.freeTestLink \{/);
  assert.ok(statSync(new URL("../public/images/holistic-house/ideas-pine-sharp.avif", import.meta.url)).size > 8000, "The scenic asset must retain enough detail for mobile");
  assert.match(css, /\.hero::after \{[\s\S]*?linear-gradient/);
  assert.match(css, /saturate\(1\.08\)/);
  assert.match(css, /\.heading \{\s*display: block;[\s\S]*?background: transparent/);
  assert.match(css, /\.heroActions\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(ui, /testOverline: "Self-guided · €0"/);
  assert.match(ui, /ask: "Get free Taoist insight"/);
  assert.match(css, /\.testPicker\[hidden\] \{ display: none; \}/);
  assert.match(css, /@media \(max-width: 360px\)[\s\S]*?\.testButton/);
});
