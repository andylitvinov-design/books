import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const carousel = read("components/home-section-carousel.tsx");
const style = read("components/services-conversion-hero.module.css");

test("home reuses the Services photo slider with six real destinations, not fake service filters", () => {
  const ids = ["services", "tests", "academy", "business", "ideas", "cabinet"];
  const routes = ["/services", "/client/tests", "/academy", "/explore/business", "/books", "/app"];
  for (let i = 0; i < ids.length; i++) {
    assert.ok(carousel.includes('key: "' + ids[i] + '", href: "' + routes[i] + '"'), "Missing section route: " + ids[i]);
    assert.ok(carousel.includes('data-home-slide-action={slide.key}'));
  }
  assert.equal((carousel.match(/\{ key: "[a-z]+", href:/g) ?? []).length, 6);
  assert.match(carousel, /slide.key === "cabinet" && locale === "es" \? "\/en\/app"/);
  assert.doesNotMatch(carousel, /setTopic\(|useServicesExplorer|fetch\(|sendBeacon\(|localStorage|sessionStorage/);
  assert.match(carousel, /href=\{href\}/);
  assert.match(carousel, /prefetch=\{false\}/);
});

test("all slide imagery exists locally and preserves the low-cost static image pipeline", () => {
  const matches = [...carousel.matchAll(/image: "(\/[^"]+)"/g)];
  assert.equal(matches.length, 6);
  for (const [, src] of matches) assert.ok(existsSync(join(process.cwd(), "public", src)), "Missing homepage slide artwork: " + src);
  assert.match(carousel, /<StaticPortrait src="\/images\/holistic-house\/andy-about\.png"/);
  assert.match(carousel, /<Image src=\{slide.image\} alt="" fill unoptimized/);
  assert.match(carousel, /priority=\{index === 0 && !manual\}/);
});

test("localized slider appears first on EN/RU/ES without removing existing consented offers", () => {
  const home = read("components/holistic-house-home.tsx");
  const spanish = read("app/es/page.tsx");
  for (const language of ["en:", "ru:", "es:"]) assert.ok(carousel.includes(language));
  for (const [page, marker] of [[home, "<HomeSectionCarousel locale={locale} />"], [spanish, '<HomeSectionCarousel locale="es" />']]) {
    const at = page.indexOf(marker);
    assert.ok(at > 0, "Homepage must mount carousel");
    assert.ok(at < page.indexOf('className="service-home-hero"'), "Carousel must precede original CTA intro");
    for (const kind of ["paid-sessions", "free-written-review", "free-tests"]) assert.ok(page.includes(kind), "Missing existing CTA: " + kind);
    assert.ok(page.includes("data-home-featured-intro"));
  }
  assert.match(read("app/holistic-house-home.css"), /\[data-home-featured-intro\]/);
});

test("touch, focus, arrows, accessible dots and reduced motion are preserved on small phones", () => {
  assert.match(carousel, /aria-roledescription="carousel"/);
  assert.match(carousel, /onFocusCapture/);
  assert.match(carousel, /onBlurCapture/);
  assert.match(carousel, /onTouchStart/);
  assert.match(carousel, /onTouchEnd=\{endSwipe\}/);
  assert.match(carousel, /Math.abs\(dx\) >= 55/);
  assert.match(carousel, /onClick=\{\(\) => navigate\(-1\)\}/);
  assert.match(carousel, /onClick=\{\(\) => navigate\(1\)\}/);
  assert.match(carousel, /aria-current=\{position === index/);
  assert.match(carousel, /prefers-reduced-motion: reduce/);
  assert.match(carousel, /document.visibilityState === "visible"/);
  assert.match(style, /\.slideCopy :is\(h1,h2\)/);
  assert.match(style, /@media\(max-width:760px\)/);
  assert.match(style, /@media\(max-width:365px\)/);
  assert.match(style, /:focus-visible/);
});
