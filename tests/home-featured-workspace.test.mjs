import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const component = read("components/home-featured-workspace.tsx");
const css = read("components/home-featured-workspace.module.css");
function catalog(name) {
  const start = component.indexOf("const " + name + " = ") + ("const " + name + " = ").length;
  const end = component.indexOf(" as const;", start);
  assert.ok(start > 0 && end > start, name + " must exist");
  return JSON.parse(component.slice(start, end));
}
const copy = catalog("copy");
const photos = catalog("photos");
const facts = catalog("offerDetails");
const ids = JSON.parse(component.match(/const moduleIds: ModuleKey\[\] = (\[[^;]+\]);/)[1]);
const expected = ["courses","personality","situation","coaching","alchemy","energy","master"];

test("seven ordered stages with unique media and one visible journey in EN/RU/ES", () => {
  assert.deepEqual(ids, expected);
  assert.match(component, /data-home-journey-count=\{moduleIds\.length\}/);
  assert.match(component, /<h1 id="hh-home-features-title">/);
  assert.match(component, /<h2 id=\{"hh-home-" \+ id \+ "-title"\}>/);
  for (const page of ["components/holistic-house-home.tsx","app/es/page.tsx"]) {
    const home = read(page);
    const tags = ["HomeSectionCarousel","HomeMoreDisclosure","HomeFeaturedWorkspace"];
    let last = -1;
    for (const tag of tags) {
      const at = home.indexOf("<" + tag);
      assert.ok(at > last, page + " ordering of " + tag);
      last = at;
    }
    assert.equal((home.match(/<HomeFeaturedWorkspace\b/g) || []).length, 1);
    for (const removed of ["HomeFreeDiagnosisBanner","HomePersonalSpaceCard","HomepageTopicJourneys","HomeMasterPath","HomeCoreMethods"])
      assert.ok(!home.includes("<" + removed), page + " repeats " + removed);
  }
  for (const locale of ["en","ru","es"]) assert.deepEqual(Object.keys(copy[locale].modules), expected);
});

test("each of 14 offer cards has a clear primary CTA and independent accessible Details button", () => {
  const size = [3,1,3,2,1,1,3];
  for (const locale of ["en","ru","es"]) {
    const list = [];
    expected.forEach((stage, i) => {
      const offers = copy[locale].modules[stage].offers;
      assert.equal(offers.length, size[i], locale + " " + stage);
      for (const o of offers) {
        list.push(o.id);
        assert.ok(o.title && o.body && o.cta, "No empty card text");
        assert.ok(photos[o.id], "No photo " + o.id);
        assert.ok(facts[locale][o.id]?.length > 210, locale + " missing a useful multi-sentence explanation: " + o.id);
      }
    });
    assert.equal(new Set(list).size, 14);
  }
  for (const path of Object.values(photos)) assert.ok(existsSync(new URL("../public" + path, import.meta.url)), path);
  assert.match(component, /data-home-module-action=\{offer\.id\}/);
  assert.match(component, /data-home-offer-primary=\{offer\.id\}/);
  assert.match(component, /data-home-offer-details=\{offer\.id\}/);
  assert.match(component, /aria-controls=\{"home-offer-info-" \+ offer\.id\}/);
  assert.match(component, /aria-expanded=\{expanded\}/);
  assert.match(component, /onClick=\{\(\) => setExpandedOffer\(expanded \? null : offer\.id\)\}/);
  assert.match(component, /hidden=\{!expanded\}/);
  assert.match(component, /<Link href=\{hrefs\[offer\.id\]\} prefetch=\{false\} className=\{styles\.offerPrimary\}/);
  assert.match(component, /<Image src=\{photos\[offer\.id\]\} alt="" fill unoptimized loading="lazy"/);
  assert.match(component, /const \[expandedOffer, setExpandedOffer\] = useState<OfferId \| null>\(null\)/);
  assert.match(component, /data-expanded=\{expanded \? "true" : "false"\}/);
  assert.match(component, /className=\{styles\.offerContent\}/);
  assert.match(component, /<h4 className=\{styles\.offerMoreTitle\}>\{detailLabels\[locale\]\.heading\}<\/h4>/);
  assert.match(component, /className=\{styles\.offerMoreLink\}/);
  assert.match(component, /aria-label=\{actionLabel\}/);
  assert.match(component, /compactActions\[locale\]\[offer\.id\]/);
  const controls = component.slice(component.indexOf('<div className={styles.offerControls}>'),
    component.indexOf('</div>', component.indexOf('<div className={styles.offerControls}>')));
  assert.ok(controls.indexOf('<button type="button"') < controls.indexOf('<Link href={hrefs[offer.id]}'),
    'Details must come before the Request/Start action on the right of the photograph');
});

test("free labels stay free and paid requests never claim confirmed payments or appointments", () => {
  for (const locale of ["en","ru","es"]) {
    const byId = Object.fromEntries(expected.flatMap(id => copy[locale].modules[id].offers).map(x => [x.id,x.cta]));
    for (const id of ["reiki","opora","profile","review","aiCoaching"])
      assert.match(byId[id], /free|бесплатн|gratis/i, locale + " " + id + " should identify free entry");
    assert.match(byId.therapist, /€50|50 €/);
    assert.doesNotMatch(byId.alchemy + byId.energy + byId.businessConstellations, /бесплатн|gratis|\bfree\b/i);
    assert.match(copy[locale].situationNote, /(?:not confirm booking|не является подтверждённой|no confirma)/);
    assert.ok(copy[locale].masterNote.length > 70);
  }
  assert.doesNotMatch(component, /fetch\(|sendBeacon|autoEnroll|autoPublish|payment_success|localStorage|sessionStorage/);
});

test("free offer corner markers cover all seven sections without mislabeling paid or mixed-price cards", () => {
  const definition = component.match(/const freeOfferIds: ReadonlySet<OfferId> = new Set\(\[([\s\S]*?)\]\);/);
  assert.ok(definition, "Shared free-offer allowlist must be explicit");
  const freeIds = [...definition[1].matchAll(/"([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(freeIds, ["reiki", "opora", "profile", "review", "aiCoaching"]);
  const labelsMatch = component.match(/const freeBadgeLabels = (\{[^\n]+\}) as const;/);
  assert.ok(labelsMatch, "All locales must be labeled");
  const labels = Object.fromEntries([...labelsMatch[1].matchAll(/(en|ru|es): "([^"]+)"/g)].map(x => [x[1], x[2]]));
  assert.deepEqual(labels, { en: "FREE", ru: "БЕСПЛАТНО", es: "GRATIS" });
  for (const locale of ["en", "ru", "es"]) {
    const offers = expected.flatMap(stage => copy[locale].modules[stage].offers);
    assert.equal(offers.length, 14);
    for (const offer of offers) {
      const actualFree = freeIds.includes(offer.id);
      if (actualFree) assert.match(offer.cta, /free|бесплатн|gratis/i, locale + " " + offer.id);
      if (["academy", "therapist", "businessConstellations", "constellations", "alchemy", "energy", "pro"].includes(offer.id))
        assert.equal(actualFree, false, locale + " " + offer.id + " is paid or mixed-price");
    }
  }
  assert.match(component, /const isFree = freeOfferIds\.has\(offer\.id\)/);
  assert.match(component, /data-home-offer-free=\{isFree \? "true" : undefined\}/);
  assert.match(component, /\{isFree && <span className=\{styles\.offerFreeBadge\}>\{freeBadgeLabels\[locale\]\}<\/span>\}/);
  assert.match(css, /\.offerFreeBadge\s*\{[\s\S]*?position: absolute;[\s\S]*?top: 0;[\s\S]*?right: 0;/);
  assert.match(css, /\.offer\[data-home-offer-free="true"\] \.offerMeta/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.offerFreeBadge/);
  assert.match(css, /background: #be2940/);
  assert.match(css, /color: #fff/);
});

test("private routes are guarded and Spanish public content uses English account fallback", () => {
  for (const dest of ["/academy/principles-of-energywork/learn","/courses/antistress",
    "/client/tests","/personality-profiles","/portrait","/portfolio#hh-development-program","/services/free-situation-review",
    "/services/business-consulting","/services/systemic-constellations","/coaching",
    "/services#consultation","/services/alchemy-of-soul","/services/remote-energy-support",
    "/pro","/practice?panel=services","/practice?panel=materials&materialTab=courses"])
    assert.ok(component.includes(dest), dest);
  assert.match(component, /const signedIn = space\?\.status === "ready" && Boolean\(space\.summary\)/);
  assert.match(component, /locale === "es" \? "en" : locale/);
  assert.match(component, /profile: "\/" \+ locale \+ "\/personality-profiles"/);
  assert.match(component, /const actionLabel = offer\.cta/);
  assert.match(component, /\{signedIn && \(/);
  assert.match(component, /data-home-reports-cta/);
  assert.match(component, /data-home-development-cta/);
  assert.doesNotMatch(component, /medicalResults|privateAnswers|testAnswers|symptomScores/);
});

test("mobile actions are inline, compact, and accessible for EN/RU/ES at 320–430px", () => {
  const start = css.indexOf("@media (max-width: 640px)");
  const narrowAt = css.indexOf("@media (max-width: 350px)");
  assert.ok(start >= 0 && narrowAt > start);
  const mobile = css.slice(start, narrowAt);
  const narrow = css.slice(narrowAt);
  assert.ok(mobile.includes(".offerControls { display: grid; grid-template-columns: max-content minmax(0, 1fr);"),
    "Details and Start must occupy two columns in one mobile row");
  assert.doesNotMatch(mobile, /\.offerControls \{[^}]*flex-direction: column/);
  assert.ok(mobile.includes(".offerSecondary { align-self: stretch; min-width: 0; min-height: 44px;"));
  assert.ok(mobile.includes(".offerPrimary { align-self: stretch; width: 100%; min-width: 0; min-height: 44px;"));
  assert.ok(mobile.includes("min-height: 150px;"));
  assert.ok(mobile.includes(".photo { align-self: stretch; height: auto; min-height: 148px;"));
  assert.ok(narrow.includes("min-height: 138px;"));
  assert.ok(narrow.includes(".photo { min-height: 136px; }"));
  assert.ok(narrow.includes(".offerControls { gap: 4px; }"));
  assert.ok(component.includes("aria-label={expanded ? detailLabels[locale].close : detailLabels[locale].open}"));
  assert.ok(component.includes("detailLabels[locale].mobileClose"));
  for (const text of ['mobileClose: "Close"', 'mobileClose: "Скрыть"', 'mobileClose: "Cerrar"']) {
    assert.ok(component.includes(text), text);
  }
  const compact = catalog("compactActions");
  for (const locale of ["en", "ru", "es"]) {
    assert.equal(Object.keys(compact[locale]).length, 18);
    for (const [id, label] of Object.entries(compact[locale])) {
      assert.ok(label.length <= 12, locale + "/" + id + " exceeds narrow mobile label limit");
    }
  }
  assert.equal(compact.en.reiki, "Start free");
  assert.equal(compact.en.opora, "Start free");
  assert.equal(compact.en.aiCoaching, "Start free");
  assert.equal(compact.ru.reiki, "Начать");
  assert.equal(compact.es.reiki, "Empezar");
});

test("full-height photo stays left and Details → Request stays right at 320–430px", () => {
  for (const needle of [
    ".offerContent", ".offerControls", ".offerPrimary", ".offerSecondary",
    ".offerMore[hidden]", ".offerMoreLink", "min-height: 44px", "max-height: none",
    'grid-template-areas: "photo content"',
    'grid-template-areas: "photo content" "more more"',
    "@media (max-width: 640px)", "@media (max-width: 350px)",
    "prefers-reduced-motion", ":focus-visible", "overflow-wrap: anywhere",
    ".photo { align-self: stretch; height: auto;",
    ".offerControls { display: grid; grid-template-columns: max-content minmax(0, 1fr);",
    ".actionFull { display: none; }", ".actionCompact { display: inline; }"
  ]) assert.ok(css.includes(needle), "Missing mobile geometry or accessibility: " + needle);
  const mobile = css.slice(css.indexOf("@media (max-width: 640px)"),
    css.indexOf("@media (max-width: 350px)"));
  assert.doesNotMatch(mobile, /"buttons buttons"/,
    "Mobile buttons must not detach below the photo");
  assert.match(mobile, /\.offer\[data-expanded="true"\] \{ grid-template-areas: "photo content" "more more"/,
    "The expanded detail panel is allowed below the two-column card");
  assert.match(css, /\.offerSecondary\s*\{\s*order: 0;/);
  assert.match(css, /\.offerPrimary\s*\{\s*order: 1;/);
  assert.match(css, /\.offer\[data-expanded="true"\]/);
  assert.doesNotMatch(css, /\.offerAction/);
})


// Source-level declaration checks, not a browser cascade or visual acceptance test.
function cssDeclarations(selector) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = clean.match(new RegExp("(?:^|})\\s*" + escaped + "\\s*\\{([^{}]*)\\}"));
  assert.ok(block, "Missing exact rule: " + selector);
  const declarations = [];
  for (const part of block[1].split(";")) {
    if (!part.trim()) continue;
    const declaration = part.match(/^\s*([a-z-]+)\s*:\s*(.*?)\s*$/i);
    assert.ok(declaration, "Expected a real declaration in " + selector);
    declarations.push([declaration[1].toLowerCase(), declaration[2]]);
  }
  return declarations;
}
function effectiveBackground(declarations) {
  return declarations.findLast(([property]) => property === "background" || property === "background-color")?.[1];
}
function luminance(hex) {
  assert.match(hex ?? "", /^#(?:[\da-f]{3}|[\da-f]{6})$/i, "Contrast needs an explicit opaque hex color");
  const full = hex.length === 4 ? [...hex.slice(1)].map(char => char + char).join("") : hex.slice(1);
  const linear = full.match(/../g).map(channel => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
  return (values[1] + 0.05) / (values[0] + 0.05);
}

test("all home cards retain compact Tests photo-card layout and readable canonical actions in EN/RU/ES", () => {
  const eyebrows = catalog("cardEyebrows");
  for (const locale of ["en", "ru", "es"]) {
    for (const stage of expected) {
      for (const offer of copy[locale].modules[stage].offers) {
        assert.ok(eyebrows[locale][offer.id], locale + " missing a card category for " + offer.id);
      }
    }
  }
  assert.match(component, /className=\{styles\.offerMeta\}/);
  assert.match(css, /\.offer \{[\s\S]*?grid-template-areas: "photo content";[\s\S]*?padding: 0;/);
  assert.match(css, /\.photo \{[\s\S]*?border-radius: 17px 0 0 17px;/);
  const secondary = css.split("\n.offerSecondary {")[1].split("}")[0];
  const primaryDeclarations = cssDeclarations(".offerPrimary");
  const primary = Object.fromEntries(primaryDeclarations);
  assert.match(secondary, /border: 0;/);
  assert.match(secondary, /background: transparent;/);
  assert.match(secondary, /text-decoration: underline;/);
  assert.doesNotMatch(secondary, /border: 1px/);
  // Preserve the published canonical palette during test cleanup. This is not
  // evidence of an authenticated owner color override after the older blue snapshot.
  assert.equal(effectiveBackground(primaryDeclarations), "#742c42");
  assert.match(primary.border ?? "", /^1px\s+solid\s+#742c42$/);
  assert.ok(contrast(primary.color, effectiveBackground(primaryDeclarations)) >= 4.5,
    "Primary action text retains at least 4.5:1 contrast");
  const hoverDeclarations = cssDeclarations(".offerPrimary:hover");
  const hover = Object.fromEntries(hoverDeclarations);
  assert.ok(contrast(hover.color ?? primary.color, effectiveBackground(hoverDeclarations)) >= 4.5,
    "Hovered primary action text retains at least 4.5:1 contrast");
  const focus = Object.fromEntries(cssDeclarations(".root :is(a, button, summary):focus-visible"));
  const outline = focus.outline?.match(/^(\d+(?:\.\d+)?)px\s+solid\s+(#[\da-f]{3}(?:[\da-f]{3})?)$/i);
  assert.ok(outline, "Keyboard focus retains a real solid outline");
  const width = focus["outline-width"] ?? outline[1] + "px";
  assert.match(width, /^\d+(?:\.\d+)?px$/);
  assert.ok(parseFloat(width) >= 2, "Keyboard focus outline is at least 2px");
  assert.equal(focus["outline-style"] ?? "solid", "solid");
  assert.match(focus["outline-offset"] ?? "", /^\d+(?:\.\d+)?px$/);
  assert.ok(parseFloat(focus["outline-offset"]) >= 2, "Keyboard focus outline stays separated from the action");
  assert.ok(contrast(focus["outline-color"] ?? outline[2], effectiveBackground(cssDeclarations(".offer"))) >= 3,
    "Keyboard focus outline retains at least 3:1 contrast against the card surface");
  assert.match(css, /\.offer\[data-expanded="true"\] \{ grid-template-areas: "photo content" "more more"/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /@media \(max-width: 350px\)/);
  assert.match(css, /\.offerControls \{ display: grid; grid-template-columns: max-content minmax\(0, 1fr\);/);
});
