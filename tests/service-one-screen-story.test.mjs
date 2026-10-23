import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const locales = ["en", "ru", "es"];

test("personal service stories use a real photo before one idea and lead to the existing enquiry", () => {
  const screen = read("components/service-story-panel.tsx");
  const css = read("components/service-story-panel.module.css");
  const landing = read("components/personal-service-landing.tsx");
  const styling = read("components/personal-service-landing.module.css");
  assert.match(screen, /data-service-story-screen=\{index\}/);
  assert.ok(screen.indexOf('className={styles.photo}') < screen.indexOf('className={styles.copy}'), "photo must precede copy");
  assert.match(screen, /<Image src=\{image\}/);
  assert.match(screen, /<Link href=\{href\}/);
  assert.match(css, /100svh/);
  assert.match(css, /@media\(max-width:767px\)/);
  assert.doesNotMatch(css, /overflow-y:hidden|max-height:calc\(100svh|line-clamp|text-overflow:ellipsis/);
  assert.match(landing, /data-personal-one-thought-screens/);
  assert.match(landing, /ServiceStoryPanel index="02"/);
  assert.match(landing, /ServiceStoryPanel index="06"/);
  assert.match(landing, /data-personal-service-more/);
  assert.match(landing, /<PersonalConsultationForm locale=\{locale\} service=\{t\.orderLabel\}/);
  assert.match(landing, /href="#request-session"/);
  assert.match(styling, /\.bookingStage/);
  assert.match(styling, /\.bookingCover/);
  assert.match(styling, /@media\(max-width:767px\) and \(max-height:650px\)/);
});

test("every localized personal landing uses the same screen journey, original approved photos and prices", () => {
  const data = read("data/personal-service-pages.ts");
  const screens = read("components/personal-service-landing.tsx");
  for (const slug of ["systemic-constellations", "imagery-therapy"]) {
    const route = read("app/[locale]/services/" + slug + "/page.tsx");
    assert.match(route, /PersonalServiceLanding/);
    assert.match(data, new RegExp('"' + slug + '":'));
    for (const locale of locales) assert.ok(route.includes("/" + locale + "/services/" + slug), locale);
  }
  for (const cost of ["€50", "€100"]) assert.ok(screens.includes(cost));
  assert.match(screens, /personalServiceImages\[service\]/);
  assert.match(screens, /t\.disclaimer/);
  assert.match(screens, /t\.faqs\.map/);
  assert.match(data, /homeopathy lacks reliable evidence/i);
});

test("business has one photo-led offer per phone screen without losing direct or messenger intake", () => {
  const ui = read("components/business-consulting-landing.tsx");
  const css = read("components/business-consulting-landing.module.css");
  assert.match(ui, /data-business-one-thought-screens/);
  assert.match(ui, /offerImages\[offer\.kind\]/);
  assert.match(ui, /\{offer\.takeaway\}/);
  assert.match(ui, /\{offer\.description\}/);
  assert.match(ui, /data-business-details/);
  assert.match(ui, /data-business-method-details/);
  assert.match(ui, /data-business-results-details/);
  assert.match(ui, /ContactChannelChooser/);
  assert.match(ui, /BusinessWebsiteEnquiry locale=\{locale\}/);
  assert.match(ui, /href="#business-direct-request"/);
  assert.match(css, /\.offerCard\.featured/);
  assert.match(css, /\.storyRun/);
  assert.match(css, /min-height:calc\(100svh - 76px\)/);
  assert.doesNotMatch(css, /overflow-y:hidden/);
});

test("Alchemy of the Soul mirrors photo-first progressive screens in EN RU ES and keeps original request", () => {
  const ui = read("components/alchemy-soul-landing.tsx");
  const css = read("components/alchemy-soul-landing.module.css");
  for (const screen of ["hero", "situations", "method", "video", "reviews", "formats", "faq", "request"]) {
    assert.ok(ui.includes('data-alchemy-panel="' + screen + '"'), screen);
  }
  assert.match(ui, /heroPortrait/);
  assert.match(ui, /className=\{styles\.panelPhoto\}/);
  assert.match(ui, /t\.pains\.slice\(1\)\.map/);
  assert.match(ui, /t\.steps\.slice\(1\)\.map/);
  assert.match(ui, /reviews\.slice\(1\)\.map/);
  assert.match(ui, /<AlchemySoulLeadForm locale=\{locale\} \/>/);
  assert.match(ui, /<ContactChannelChooser locale=\{locale\} whatsappUrl=\{heroWhatsApp\}/);
  assert.match(css, /\.heroPortrait\{order:0/);
  assert.match(css, /\.panelPhoto\{/);
  assert.match(css, /@media\(max-width:680px\) and \(max-height:650px\)/);
  assert.match(ui, /no reliable evidence/);
  assert.match(ui, /надёжной доказательной эффективности/);
  for (const locale of locales) assert.ok(ui.includes(locale + ":"), locale);
});
