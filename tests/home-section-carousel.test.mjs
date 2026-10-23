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
  assert.match(carousel, /priority=\{index === 0\}/);
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

test("iPhone touch, arrow and dot interactions cannot permanently stop automatic rotation", () => {
  assert.match(carousel, /setInterval\(\(\) => \{/);
  assert.match(carousel, /\}, 7000\)/);
  assert.match(carousel, /\[paused, interactionVersion\]/);
  assert.match(carousel, /setInteractionVersion\(version => version \+ 1\)/);
  assert.doesNotMatch(carousel, /setManual\(|paused \|\| manual/);
  const touchStart = carousel.match(/onTouchStart=\{event => \{([^]*?)\}\}/)?.[1] || "";
  assert.ok(touchStart.includes("touchStart.current"));
  assert.doesNotMatch(touchStart, /setPaused\(|setInteractionVersion\(/);
  assert.match(carousel, /\(hover: hover\) and \(pointer: fine\)/);
  assert.match(carousel, /event\.target\.matches\(":focus-visible"\)/);
  assert.match(carousel, /document\.visibilityState === "visible"/);
  assert.match(carousel, /prefers-reduced-motion: reduce/);
});

test("the highlighted top category always follows the rendered slide, including Cabinet", () => {
  assert.match(carousel, /aria-current=\{key === slide\.key \? "true" : undefined\}/);
  assert.match(carousel, /data-home-nav-active=\{key === slide\.key \? "true" : "false"\}/);
  assert.match(carousel, /ref=\{navScroller\}/);
  assert.match(carousel, /querySelector<HTMLElement>\(`\[data-home-nav-section="/);
  assert.match(carousel, /scroller\.scrollTo\(\{/);
  assert.match(style, /\.sectionNavLink\[aria-current="true"\] \{ color:#ffdb80/);
  assert.match(style, /\.sectionNavLink\[aria-current="true"\]::after/);
  assert.doesNotMatch(style, /\.sectionNavLink\[aria-current="page"\]/);
});

test("all homepage slides describe real benefits in EN, RU and ES with compact mobile copy", () => {
  const ids = ["services", "tests", "academy", "business", "ideas", "cabinet"];
  const entries = [...carousel.matchAll(/^      (services|tests|academy|business|ideas|cabinet): \{ eyebrow: "([^"]+)", title: "([^"]+)", lead: "([^"]+)", action: "([^"]+)" \},$/gm)];
  assert.equal(entries.length, 18, "Six complete benefit statements are required in every locale");

  for (let languageIndex = 0; languageIndex < 3; languageIndex++) {
    assert.deepEqual(entries.slice(languageIndex * 6, languageIndex * 6 + 6).map(match => match[1]), ids);
  }
  for (const [, id, eyebrow, title, lead, action] of entries) {
    assert.ok(eyebrow.length >= 8 && eyebrow.length <= 46, id + ": readable section label");
    assert.ok(title.length >= 16 && title.length <= 46, id + ": short, specific heading");
    assert.ok(lead.length >= 55 && lead.length <= 145, id + ": tangible benefit in phone-sized copy");
    assert.ok(action.length >= 7 && action.length <= 34, id + ": concise action");
    assert.doesNotMatch(lead, /cures?|diagnos|лечит|излеч|cura enfermedades/i);
  }
  assert.match(carousel, /lead: "Save test reports, continue courses, revisit recommendations/);
  assert.match(carousel, /lead: "Сохраняйте отчёты, продолжайте курсы, возвращайтесь к рекомендациям/);
  assert.match(carousel, /lead: "Guarda informes, continúa tus cursos, revisa recomendaciones/);
  assert.match(carousel, /title: "Free tests to understand yourself"/);
  assert.match(carousel, /title: "Курсы, уроки и медитации"/);
  assert.match(carousel, /title: "Nuevas ideas para tu pregunta"/);
});

test("the approved photo hero has light text-only section links without replacing its slider", () => {
  const sections = ["home", "tests", "services", "academy", "business", "ideas", "cabinet"];
  assert.match(carousel, /const navKeys = \["home", "tests", "services", "academy", "business", "ideas", "cabinet"\] as const/);
  assert.match(carousel, /<nav className=\{styles\.sectionNav\} aria-label=\{t\.navigationLabel\}/);
  assert.match(carousel, /data-home-nav-section=\{key\}/);
  assert.match(carousel, /aria-current=\{key === slide\.key \? "true" : undefined\}/);
  assert.match(carousel, /slides\.find\(item => item\.key === key\)/);
  assert.match(carousel, /href=\{target \? `\/\$\{locale\}\$\{target\.href\}` : locale === "en" \? "\/" : `\/\$\{locale\}`\}/);
  for (const item of sections) assert.match(carousel, new RegExp(item + ': "'));
  for (const label of ["Главная", "Тесты", "Услуги", "Академия", "Бизнес", "Идеи", "Кабинет", "Inicio", "Pruebas", "Servicios", "Academia", "Negocios", "Mi espacio"]) {
    assert.ok(carousel.includes(label), "Missing localized top navigation label: " + label);
  }
  assert.ok(carousel.indexOf("className={styles.sectionNav}") > carousel.indexOf("className={styles.gradient}"));
  assert.ok(carousel.indexOf("className={styles.sectionNav}") < carousel.indexOf("className={styles.slideCopy}"));
  assert.match(style, /\.sectionNav \{[^}]*position:absolute/);
  assert.match(style, /\.sectionNavScroller \{[^}]*overflow-x:auto/);
  assert.match(style, /\.sectionNavLink \{[^}]*min-height:44px/);
  assert.match(style, /\.sectionNavLink\[aria-current="true"\]/);
  assert.match(style, /@media \(max-width:365px\)/);
  assert.doesNotMatch(carousel, /navKeys\.map[^]*?<svg/);
});

test("homepage slider category bar matches the outlined oval and contrast-white active pill on narrow iPhones", () => {
  const scoped = style.split("/* Homepage-only segmented navigation:")[1];
  assert.ok(scoped, "Missing homepage-only pill styles");
  assert.match(scoped, /\.hero\[data-home-section-carousel\] \.sectionNav \{/);
  assert.match(scoped, /border: 1px solid rgba\(255, 253, 246, \.70\)/);
  assert.match(scoped, /border-radius: 999px/);
  assert.match(scoped, /\.sectionNavScroller \{[^}]*gap: 2px/s);
  assert.match(scoped, /\.sectionNavLink \{[^}]*min-height: 44px/s);
  assert.match(scoped, /\.sectionNavLink\[aria-current="true"\] \{[^}]*color: #23394d;[^}]*background: #fffdfa;/s);
  assert.match(scoped, /\.sectionNavLink \+ \.sectionNavLink::before,[^]*?content: none/);
  assert.match(scoped, /@media \(max-width: 760px\)/);
  assert.match(scoped, /@media \(max-width: 365px\)/);
  assert.match(scoped, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(carousel, /data-home-nav-active=\{key === slide\.key \? "true" : "false"\}/);
  // Touch-scrolling the 7 labels must not also swipe the parent photo carousel.
  assert.match(carousel, /onTouchStart=\{event => event\.stopPropagation\(\)\}/);
  assert.match(carousel, /onTouchEnd=\{event => event\.stopPropagation\(\)\}/);
  assert.match(carousel, /onTouchCancel=\{event => event\.stopPropagation\(\)\}/);
});
