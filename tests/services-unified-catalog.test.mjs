import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => readFileSync(resolve(root, path), "utf8");
const page = read("app/[locale]/services/page.tsx");
const studio = read("components/services-studio-offers.tsx");
const catalog = read("components/services-unified-catalog.tsx");
const css = read("components/services-unified-catalog.module.css");

test("the original Services dialogue remains before the lower-page redesign", () => {
  assert.equal((page.match(/<ServicesAssistMobile locale=/g) || []).length, 1);
  assert.ok(page.indexOf("<ServicesAssistMobile") < page.indexOf("<ServicesCompactCatalog"));
  assert.equal((page.match(/<ServicesPersonalConsultationMobile locale=/g) || []).length, 1);
  assert.equal((page.match(/<CompactLeadCapture locale=/g) || []).length, 1);
});

test("all approved mobile service directions have a single dedicated expandable panel", () => {
  const ids = [...page.matchAll(/<ServicesCompactPanel id="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(ids, ["reiki", "browse", "reading", "consultation", "services",
    "video", "courses", "coach", "magical", "homeopathy", "about",
    "testimonials", "mytube", "directory"]);
  for (const name of ["AssistReikiSession", "ServicesConversionHero", "SpiritualReadingEntry",
    "PublicConsultationCta", "ServicesStudioOffers", "ServicesVideoGenerationCard",
    "ServicesCoursesShelf", "ServicesCoachTherapistMobile", "ServicesMagicalHelpMobile",
    "ServicesIntroMedia", "PersonalTestimonials", "ServicesMethodVideos",
    "ServicesDirectoryInvitation", "CompactLeadCapture"]) {
    assert.equal(page.split("<" + name + " ").length - 1, 1, name);
  }
  assert.match(page, /<ServicesStudioOffers locale=\{locale as Locale\} splitExtras/);
  assert.match(studio, /!splitExtras && offer\.id === "alchemy"/);
  assert.match(studio, /!splitExtras \? <ServicesCoursesShelf/);
  assert.match(studio, /!splitExtras \? <ServicesCoachTherapistMobile/);
});

test("mobile panels use accessible controls, desktop passthrough and real routes", () => {
  assert.match(catalog, /aria-expanded=\{expanded\}/);
  assert.match(catalog, /aria-controls=\{regionId\}/);
  assert.match(catalog, /value === id \? null : id/);
  assert.match(catalog, /services\/psychohomeopathy/);
  assert.match(css, /\.catalog,\.grid,\.panel,\.content\{display:contents\}/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /@media\(max-width:350px\)/);
  assert.match(css, /data-services-studio-card/);
  assert.match(css, /data-consultation-choice/);
});

test("existing public consultation and other deep links reveal the real mobile panel", () => {
  const workspace = read("components/home-featured-workspace.tsx");
  assert.match(workspace, /\/services#consultation/);
  assert.match(page, /<PublicConsultationCta locale=\{locale as Locale\} id="consultation" serviceBooking wiseEnabled=\{wisePaymentsEnabled\(\)\} paypalPersonalEnabled=\{personalPayPalEnabled\(\)\} \/>/);
  for (const [hash, panel] of [
    ["consultation", "consultation"], ["free-insights", "services"],
    ["solutions", "services"], ["method-videos", "mytube"],
    ["meet-andrey", "about"],
  ]) {
    assert.ok(catalog.includes('' + JSON.stringify(hash).replace(/^"|"$/g, "") + ''),
      "Missing public linked section: " + hash);
    assert.ok(catalog.includes('"' + panel + '"'), "Missing panel: " + panel);
  }
  assert.match(catalog, /window\.addEventListener\("hashchange", revealLinkedService\)/);
  assert.match(catalog, /panel\?\.scrollIntoView/);
  assert.match(css, /scroll-margin-top:calc\(64px/);
});

test("Spanish Services uses the exact same mobile catalogue as EN/RU", () => {
  const spanish = read("app/es/services/page.tsx");
  const expected = [...page.matchAll(/<ServicesCompactPanel id="([^"]+)"/g)].map(x => x[1]);
  const actual = [...spanish.matchAll(/<ServicesCompactPanel id="([^"]+)"/g)].map(x => x[1]);
  assert.deepEqual(actual, expected, "Do not strand ES on the obsolete page after a mobile redesign");
  assert.ok(spanish.indexOf("<ServicesAssistMobile") < spanish.indexOf("<ServicesCompactCatalog"),
    "Spanish messenger remains at the top of Services");
  assert.match(spanish, /<PublicConsultationCta locale="es" id="consultation" serviceBooking wiseEnabled=\{wisePaymentsEnabled\(\)\} paypalPersonalEnabled=\{personalPayPalEnabled\(\)\} \/>/);
  assert.equal((spanish.match(/<ServicesCoursesShelf /g) || []).length, 1);
  assert.equal((spanish.match(/<ServicesCoachTherapistMobile /g) || []).length, 1);
  assert.equal((spanish.match(/<ServicesVideoGenerationCard /g) || []).length, 1);
  assert.equal((spanish.match(/<CompactLeadCapture /g) || []).length, 1);
  assert.match(spanish, /<ServicesStudioOffers locale="es" splitExtras \/>/);
});
