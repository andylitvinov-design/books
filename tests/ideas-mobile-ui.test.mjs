import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("approved Ideas design keeps question, submit button and three touch-sized choices on one mobile row", () => {
  const ui = read("components/ideas-discovery.tsx");
  const css = read("components/ideas-discovery.module.css");
  assert.match(ui, /<form className=\{styles\.question\} onSubmit=\{submitQuestion\}>/);
  assert.match(ui, /<button type="submit" className=\{styles\.submit\}>/);
  assert.match(ui, /type="button" onClick=\{\(\) => choose\("dao"\)\}/);
  assert.match(ui, /type="button" onClick=\{\(\) => choose\("aphorisms"\)\}/);
  assert.match(ui, /type="button" onClick=\{\(\) => choose\("personal"\)\}/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.actions \{ grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.action \{ flex-direction: column;[\s\S]*?min-height: 72px/);
  assert.match(css, /\.submit \{ width: 100%; min-height: 46px/);
  assert.match(css, /\.question textarea \{ min-height: 47px;[\s\S]*?font-size: 16px/);
  assert.match(css, /@media \(max-width: 360px\)/);
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
  const free = read("app/[locale]/services/free-situation-review/page.tsx");
  assert.match(ui, /data-ideas-dao-promos/);
  assert.match(ui, /result\.mode === "dao" && hexagram[\s\S]*?<DaoOfferCards locale=\{answerLocale\}[\s\S]*?result\.mode === "aphorisms"/);
  assert.match(ui, /answerCopy\.daoPromoReading\.title/);
  assert.match(ui, /answerCopy\.daoPromoGift\.title/);
  assert.match(ui, /\/services\/free-consultation#intro-request/);
  assert.match(ui, /\/services\/free-situation-review#request-free-review/);
  assert.match(intro, /id="intro-request"/);
  assert.match(free, /FreeEntryLanding locale=\{locale\} kind="situation"/);
  for (const text of ["Получите персональное даосское гадание", "Get a personal Daoist reading", "Recibe una lectura taoísta personal", "ПОДАРОК · БЕСПЛАТНО", "FREE GIFT", "REGALO · GRATIS"]) {
    assert.ok(ui.includes(text), "missing localized offer: " + text);
  }
  assert.match(css, /\.daoPromos \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.daoPromos \{ grid-template-columns: 1fr/);
  assert.match(css, /\.daoPromoAction \{[^}]*min-height: 44px/);
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
  assert.match(ui, /answerCopy\.daoPromoGift\.title/);
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
    '<AphorismTiles items={getIdeasAphorismMatches("growth"',
    '<DaoInsightPanel entry={exampleHexagram}',
    '<DaoOfferCards locale={locale}',
  ]), "educational preview must follow the same order");
  assert.match(css, /\.relatedAphorisms \.aphorisms \{ grid-template-columns:minmax\(0,1fr\); overflow:visible; \}/);
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
