import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { activeCompactNavigationId, getCompactNavigation, getSiteNavigation } from "../lib/site-navigation-model.js";
import { safePublicWhatsAppPath } from "../lib/whatsapp-enquiry.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Holistic Support is the seventh public tab and preserves separate Temple Insights", () => {
  const bar = read("components/mobile-bottom-navigation.tsx");
  const icons = read("components/compact-navigation-icons.ts");
  const css = read("app/ia-v2.css");
  const homeCss = read("app/holistic-house-home.css");
  for (const locale of ["en", "ru", "es"]) {
    const links = getCompactNavigation(locale);
    assert.equal(links.length, 7);
    assert.deepEqual(links.map(item => item.id), ["home", "analysis", "courses", "profile", "coaching", "pro", "temple"]);
    assert.equal(links[1].href, "/" + locale + "/services/free-situation-review");
    assert.equal(links[2].href, "/" + locale + "/academy");
    assert.equal(links[6].href, "/" + locale + "/holistic-support");
    assert.equal(links[6].label, {en:"Holistic Support",ru:"Холистическая поддержка",es:"Apoyo holístico"}[locale]);
    assert.equal(activeCompactNavigationId("/" + locale + "/holistic-support"), "temple");
    assert.equal(activeCompactNavigationId("/" + locale + "/temple-insights"), "temple");
    assert.ok(getSiteNavigation(locale).some(x => x.id === "temple" && x.label === links[6].label));
    assert.equal(safePublicWhatsAppPath("/" + locale + "/holistic-support"), "/" + locale + "/holistic-support");
  }
  assert.equal(safePublicWhatsAppPath("/en/client/report/private"), "");
  assert.match(icons, /analysis: Sparkles/);
  assert.match(icons, /courses: BookOpen/);
  assert.match(icons, /temple: Landmark/);
  assert.match(bar, /temple: 'Holistic Support'/);
  for (const label of ["Holistic Support", "Поддержка", "Apoyo holístico"])
    assert.ok(bar.includes("temple: '" + label + "'"), "missing mobile tab label " + label);
  assert.match(bar, /aria-label=\{item\.ariaLabel\}/);
  assert.match(css, /repeat\(7,minmax\(0,1fr\)\)/);
  assert.match(css, /@media \(max-width: 600px\)/);
  assert.match(homeCss, /repeat\(7, minmax\(0,1fr\)\)/);
});


test("Holistic Support puts an interactive scenic goal-or-situation card first in EN/RU/ES", () => {
  const page = read("app/[locale]/holistic-support/page.tsx");
  const ideas = read("components/ideas-discovery.tsx");
  const scenic = read("components/ideas-discovery.module.css");
  const styles = read("app/[locale]/holistic-support/holistic-support.module.css");
  const old = read("app/[locale]/temple-support/page.tsx");
  const locales = read("lib/public-locales.ts");
  const home = read("components/home-explore-sections.tsx");
  const sitemap = read("app/sitemap.ts");

  for (const locale of ["en", "ru", "es"]) {
    assert.ok(page.includes(locale + ": {"), locale + " locale");
    assert.ok(page.includes(locale + ': "/' + locale + '/holistic-support"'));
  }
  assert.ok(old.includes('permanentRedirect("/" + locale + "/holistic-support")'));
  assert.ok(page.includes("data-holistic-support"));
  assert.ok(page.includes("data-holistic-first-screen"));
  assert.ok(page.includes('<IdeasDiscovery locale={locale} variant="holistic" />'));
  assert.equal((page.match(/<IdeasDiscovery /g) || []).length, 1, "only one symbolic-engine form");
  assert.ok(page.indexOf("data-holistic-first-screen") < page.indexOf("data-holistic-healing"));
  assert.ok(!page.includes("<FreeDiagnosticStart") && !page.includes("<CompactLeadCapture"),
    "the personal coaching form moves to Coaching");
  assert.ok(!page.includes("styles.hero"), "the big coaching hero was removed");
  assert.ok(ideas.includes('variant?: "ideas" | "temple" | "holistic"'));
  assert.ok(ideas.includes("data-holistic-entry"));
  for(const label of [
    "Holistic Support", "Холистическая поддержка", "Apoyo holístico",
    "Get a free symbolic insight", "Получить бесплатную подсказку", "Recibir una reflexión gratuita",
    "Request energy support", "Получить энергетическую поддержку", "Solicitar apoyo energético",
  ]) assert.ok(ideas.includes(label), "missing localized first-screen text: " + label);
  assert.ok(ideas.includes('href={"/" + locale + "/services/remote-energy-support"}'));
  assert.ok(ideas.includes("onClick={() => stageRemoteSupportLandingIntention(question)}"));
  assert.ok(ideas.includes("drawRandomHexagram()"));
  assert.ok(scenic.includes('ideas-pine-sharp.avif'));
  assert.ok(scenic.includes('@media (max-width: 360px)'));
  assert.ok(styles.includes(".primaryEntry"));
  assert.ok(styles.includes(".coachingAside"));
  assert.ok(styles.includes("@media(max-width:350px)"));
  assert.ok(locales.includes("holistic-support"));
  assert.ok(home.includes('path: "/holistic-support"'));
  assert.ok(sitemap.includes("locale + '/holistic-support'"));
  assert.ok(!sitemap.includes("locale + '/temple-support'"));
  assert.ok(existsSync(new URL("../public/images/holistic-house/ideas-pine-sharp.avif", import.meta.url)));
});

test("energy support reuses the published practitioner, privacy and request journeys", () => {
  const page = read("app/[locale]/holistic-support/page.tsx");
  const remote = read("components/remote-energy-support-booking.tsx");
  const bridge = read("lib/practitioners/remote-energy-support.js");
  assert.ok(page.includes("data-holistic-healing"));
  for (const id of ["energy", "alchemy", "practitioner"]) {
    assert.ok(page.includes('data-holistic-offer="' + id + '"'), "missing offer " + id);
  }
  for (const link of ["/services/remote-energy-support", "/services/alchemy-of-soul",
    "/pro#profi-practice", "/masters"]) assert.ok(page.includes(link), "missing link "+link);
  assert.ok(page.includes("data-holistic-practitioner-cta"));
  assert.ok(page.includes("MarketplaceMasterFinder practitioners={energyPractitioners}"));
  assert.ok(page.includes('service.status === "published"'));
  assert.ok(page.includes("data-holistic-coaching-followup"));
  assert.ok(page.includes('href={"/" + locale + "/coaching"}'));
  assert.ok(page.includes("€50 / 30"));
  assert.match(page, /Homeopathy lacks reliable evidence|homeopatía carece|у гомеопатии нет/);
  assert.ok(remote.includes("takeRemoteSupportLandingIntention()"));
  assert.ok(remote.includes("if (stagedIntention) setIntention(stagedIntention)"));
  assert.ok(bridge.includes("stageRemoteSupportLandingIntention"));
  assert.ok(bridge.includes("takeRemoteSupportLandingIntention"));
  assert.doesNotMatch(bridge.slice(bridge.indexOf("// One-use, same-tab handoff")),
    /sessionStorage\.setItem|localStorage\.setItem|fetch\(/);
  assert.doesNotMatch(page, /checkout|charge\(/);
});

test("independent Temple Insights keeps its own diagnostic CTA and natural scenic layout", () => {
  const ideas = read("components/ideas-discovery.tsx");
  const scenic = read("components/ideas-discovery.module.css");
  assert.ok(ideas.includes('variant === "temple" ? <Link'));
  assert.ok(ideas.includes('href={freeOfferHref(locale, "review")}'));
  assert.ok(ideas.includes("data-ideas-personal-diagnostic"));
  assert.ok(ideas.includes("data-ideas-free-test"));
  assert.ok(ideas.includes('const HeadingTag = variant === "temple" ? "h2" : "h1"'));
  assert.ok(scenic.includes('data-temple-mode="true"'));
  assert.ok(scenic.includes('.templeScenic::before'));
});
