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
    const tags = ["HomeSectionCarousel","HomeFeaturedWorkspace","HomeMoreDisclosure"];
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

test("each of 16 offer cards has a clear primary CTA and independent accessible Details button", () => {
  const size = [3,3,3,2,1,1,3];
  for (const locale of ["en","ru","es"]) {
    const list = [];
    expected.forEach((stage, i) => {
      const offers = copy[locale].modules[stage].offers;
      assert.equal(offers.length, size[i], locale + " " + stage);
      for (const o of offers) {
        list.push(o.id);
        assert.ok(o.title && o.body && o.cta, "No empty card text");
        assert.ok(photos[o.id], "No photo " + o.id);
        assert.ok(facts[locale][o.id]?.length > 50, locale + " missing details: " + o.id);
      }
    });
    assert.equal(new Set(list).size, 16);
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
});

test("free labels stay free and paid requests never claim confirmed payments or appointments", () => {
  for (const locale of ["en","ru","es"]) {
    const byId = Object.fromEntries(expected.flatMap(id => copy[locale].modules[id].offers).map(x => [x.id,x.cta]));
    for (const id of ["reiki","opora","allTests","review","aiCoaching"])
      assert.match(byId[id], /free|бесплатн|gratis/i, locale + " " + id + " should identify free entry");
    assert.match(byId.therapist, /€50|50 €/);
    assert.doesNotMatch(byId.alchemy + byId.energy + byId.businessConstellations, /бесплатн|gratis|\bfree\b/i);
    assert.match(copy[locale].situationNote, /(?:not confirm booking|не является подтверждённой|no confirma)/);
    assert.ok(copy[locale].masterNote.length > 70);
  }
  assert.doesNotMatch(component, /fetch\(|sendBeacon|autoEnroll|autoPublish|payment_success|localStorage|sessionStorage/);
});

test("private routes are guarded and Spanish public content uses English account fallback", () => {
  for (const dest of ["/academy/principles-of-energywork/learn","/courses/antistress",
    "/client/tests","/portrait","/portfolio#hh-development-program","/services/free-situation-review",
    "/services/business-consulting","/services/systemic-constellations","/coaching",
    "/services#consultation","/services/alchemy-of-soul","/services/remote-energy-support",
    "/pro","/practice?panel=services","/practice?panel=materials&materialTab=courses"])
    assert.ok(component.includes(dest), dest);
  assert.match(component, /const signedIn = space\?\.status === "ready" && Boolean\(space\.summary\)/);
  assert.match(component, /locale === "es" \? "en" : locale/);
  assert.match(component, /offer\.id === "profile" && !signedIn/);
  assert.match(component, /offer\.id === "growth" && !signedIn/);
  assert.match(component, /\{signedIn && \(/);
  assert.match(component, /data-home-reports-cta/);
  assert.match(component, /data-home-development-cta/);
  assert.doesNotMatch(component, /medicalResults|privateAnswers|testAnswers|symptomScores/);
});

test("cards and CTAs remain legible at 320–430px, 44px touch targets and reduced motion", () => {
  for (const needle of [".offerControls",".offerPrimary",".offerSecondary",
    ".offerMore[hidden]","min-height: 44px","max-height: none",
    'grid-template-areas: "photo body" "buttons buttons" "more more"',
    "@media (max-width: 640px)","@media (max-width: 350px)","prefers-reduced-motion",
    ":focus-visible","overflow-wrap: anywhere"]) assert.ok(css.includes(needle), needle);
  assert.doesNotMatch(css, /\.offerAction/);
});
