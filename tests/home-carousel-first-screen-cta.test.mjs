import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("EN/RU/ES lead with the real carousel, then free diagnosis, then the question dialogue", () => {
  const home = read("components/holistic-house-home.tsx");
  const es = read("app/es/page.tsx");
  const carousel = read("components/home-section-carousel.tsx");
  for (const [page, locale] of [[home, "{locale}"], [es, '"es"']]) {
    const tag = locale === "{locale}" ? "locale={locale}" : 'locale="es"';
    const slider = page.indexOf("<HomeSectionCarousel " + tag + " />");
    const banner = page.indexOf("<HomeFreeDiagnosisBanner " + tag + " />");
    const question = page.indexOf("<HomeConversationGuide " + tag + " />");
    assert.ok(slider >= 0 && slider < banner && banner < question, "Expected carousel → diagnosis → dialogue");
    assert.ok(page.includes("paid-sessions"), "Paid consultation remains below the dialogue");
  }
  assert.doesNotMatch(carousel, /data-home-quick-booking|data-home-quick-cta/, "No paid strip before first slider");
  assert.match(carousel, /data-home-hero-nav="true"/);
  assert.match(carousel, /data-home-slide-dot=\{item.key\}/);
});

test("free diagnosis button reveals one compact messenger handoff inside its warm card", () => {
  const banner = read("components/home-free-diagnosis-banner.tsx");
  const css = read("components/home-free-diagnosis-banner.module.css");
  assert.match(banner, /data-home-free-diagnosis-banner/);
  assert.match(banner, /data-home-diagnosis-order/);
  assert.match(banner, /aria-expanded=\{open\}/);
  assert.match(banner, /aria-controls=\{formId\}/);
  assert.match(banner, /hidden=\{!open\}/);
  assert.match(banner, /data-home-diagnosis-request/);
  assert.match(banner, /data-home-diagnosis-channel="whatsapp"/);
  assert.match(banner, /data-home-diagnosis-channel="telegram"/);
  assert.match(banner, /fetch\("\/api\/service-enquiries"/);
  assert.match(banner, /contactConsent: true/);
  assert.match(banner, /sourcePath: "\/" \+ locale \+ "\/services\/free-situation-review"/);
  assert.match(banner, /serviceTitle: SERVICE_TITLE/);
  assert.match(banner, /result\?\.saved !== true/);
  assert.match(banner, /setReference\(result\.referenceCode\)/);
  assert.match(banner, /window\.open\("about:blank", "_blank"\)/);
  assert.match(banner, /handoffWindow\?\.close\(\)/);
  assert.doesNotMatch(banner, /CompactLeadCapture|data-compact-last-slide/);
  assert.match(css, /\.request \{ grid-column: 1\/-1;/);
  assert.match(css, /\.request\[hidden\] \{ display: none; \}/);
  assert.match(css, /\.channels :is\(button,a\) \{[^}]*min-height: 46px/s);
  for (const heading of ["Бесплатная диагностика ситуации", "Free situation assessment", "Evaluación gratuita"]) {
    assert.ok(banner.includes(heading), heading);
  }
  for (const benefit of ["Personal written review", "Личный письменный разбор", "Informe personal escrito"]) {
    assert.ok(banner.includes(benefit), benefit);
  }
});

test("slider and benefit-rich banner fit the first mobile fold without impacting service pages", () => {
  const sliderCss = read("components/services-conversion-hero.module.css");
  const bannerCss = read("components/home-free-diagnosis-banner.module.css");
  assert.match(sliderCss, /\.hero\[data-home-section-carousel\] \.slider \{ height: clamp\(302px, 39svh, 336px\); min-height: 0;/);
  assert.match(sliderCss, /\.hero\[data-home-section-carousel\] \.slider \{ height: 258px; min-height: 0;/);
  assert.match(bannerCss, /@media \(max-width: 365px\)/);
  assert.match(bannerCss, /\.order \{[^}]*min-height: 45px/s);
  assert.match(bannerCss, /\.root :is\(a, button, input\):focus-visible/);
  assert.match(bannerCss, /@media \(max-width: 760px\) and \(max-height: 700px\)/);
});


test("priced consultation is the visible first-slide action in EN/RU/ES without moving the carousel below a strip", () => {
  const carousel = read("components/home-section-carousel.tsx");
  const css = read("components/services-conversion-hero.module.css");
  const browser = read("scripts/verify-home-consultation-first-screen.mjs");
  for (const label of [
    "Request a consultation · from €50",
    "Запросить консультацию · от €50",
    "Solicitar una consulta · desde €50",
  ]) {
    assert.ok(carousel.includes('action: "' + label + '"'), "The first visible carousel slide should use the localized consultation CTA");
  }
  assert.match(carousel, /slide\.key === "services" \? \x60\/\$\{locale\}\/services#consultation\x60/);
  assert.match(carousel, /data-home-first-screen-cta=\{slide\.key === "services" \? "paid" : undefined\}/);
  assert.match(carousel, /key === "cabinet" && locale === "es" \? "\/en\/app"/);
  assert.match(css, /\.hero\[data-home-section-carousel\] \.viewButton\[data-home-first-screen-cta="paid"\]/);
  assert.match(browser, /data-home-first-screen-cta="paid"/);
  assert.match(browser, /await paid\.waitFor\(\{ state: 'visible'/);
  assert.match(browser, /book\.y \+ book\.height <= 844 - 72/);
  assert.doesNotMatch(browser, /data-home-quick-booking|data-home-quick-cta/);
  assert.doesNotMatch(carousel, /data-home-quick-booking|data-home-quick-cta/);
});
