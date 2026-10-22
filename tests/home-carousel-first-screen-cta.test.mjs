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

test("free diagnosis button opens a mini CRM request under this same banner, not a new page", () => {
  const banner = read("components/home-free-diagnosis-banner.tsx");
  const capture = read("components/compact-lead-capture.tsx");
  assert.match(banner, /data-home-free-diagnosis-banner/);
  assert.match(banner, /data-home-diagnosis-order/);
  assert.match(banner, /aria-expanded=\{open\}/);
  assert.match(banner, /aria-controls=\{formId\}/);
  assert.match(banner, /hidden=\{!open\}/);
  assert.match(banner, /<CompactLeadCapture/);
  assert.match(banner, /sourcePath=\{"\/" \+ locale \+ "\/services\/free-situation-review"\}/);
  assert.match(banner, /serviceTitle="Free drawing-based situation review"/);
  assert.match(capture, /sourcePath: sourcePath \|\| pathname/);
  assert.match(capture, /fetch\("\/api\/service-enquiries"/);
  assert.match(capture, /result\?\.saved !== true/);
  assert.match(capture, /contactConsent: true/);
  assert.doesNotMatch(banner, /fetch\(|sendBeacon|localStorage|window\.location|whatsappEnquiryUrl/);
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
