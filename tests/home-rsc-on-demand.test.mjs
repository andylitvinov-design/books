import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("home reuses seven offers and no longer repeats reviews, method promos or direction cards below", () => {
  const filters = read("components/home-more-disclosure.tsx");
  for (const page of ["components/holistic-house-home.tsx","app/es/page.tsx"]) {
    const source = read(page);
    assert.match(source, /<HomeFeaturedWorkspace locale=/);
    assert.match(source, /<HomeMoreDisclosure locale=/);
    assert.doesNotMatch(source, /<HomeFreeDiagnosisBanner|<HomepageTopicJourneys|<HomePersonalSpaceCard|<HomeCoreMethods|<HomeMasterPath|service-home-hero/);
    assert.doesNotMatch(source, /<ServicesSolutions|<HomeExploreSections|<TestSelectionCourseBanner/);
    // "Explore by topic" is intentionally above the seven-stage service list.
    // Keep the carousel first and testimonials below without duplicating offers.
    assert.ok(source.indexOf("<HomeSectionCarousel") < source.indexOf("<HomeMoreDisclosure"));
    assert.ok(source.indexOf("<HomeMoreDisclosure") < source.indexOf("<HomeFeaturedWorkspace"));
    assert.ok(source.indexOf("<HomeFeaturedWorkspace") < source.indexOf("<PersonalTestimonials"));
  }
  assert.match(filters, /data-home-topic-filters/);
  assert.match(filters, /data-home-more-deferred="true"/);
  assert.match(filters, /onToggle=\{event => setExpanded\(event\.currentTarget\.open\)\}/);
  assert.match(filters, /\{expanded \? <HomeConversationGuide locale=\{locale\} \/> : null\}/);
  assert.match(filters, /dynamic\(\s*\(\) => import\("\.\/home-conversation-guide"\)/);
  assert.match(filters, /ssr: false/);
  for (const topic of ["energy","love","business","services","courses"]) {
    assert.ok(filters.includes('data-home-topic-filter="' + topic + '"'), topic);
  }
  assert.doesNotMatch(filters, /<HomepageTopicJourneys|<ServicesSolutions|<HomeFreeDiagnosisBanner|<TestSelectionCourseBanner|<HomeExploreSections/);
  assert.doesNotMatch(filters, /fetch\(|sendBeacon|localStorage|dangerouslySetInnerHTML|\/api\/client/);
});

test("filter chips link existing localized routes with compact, accessible styling", () => {
  const jsx = read("components/home-more-disclosure.tsx");
  const css = read("components/home-more-disclosure.module.css");
  for (const route of ["/explore/energy","/explore/love","/explore/business","/services","/academy"]) {
    assert.ok(jsx.includes(route), route);
  }
  for (const label of ["ВЫБЕРИТЕ НАПРАВЛЕНИЕ","CHOOSE YOUR DIRECTION","ELIGE TU DIRECCIÓN"])
    assert.ok(jsx.includes(label));
  for (const style of ["min-height: 44px","@media (max-width: 640px)",":focus-visible","flex-wrap: wrap","prefers-reduced-motion"])
    assert.ok(css.includes(style));
  assert.match(read("components/holistic-house-home.tsx"), /<HomepageContactCta locale=\{locale\} \/>/);
  assert.match(read("app/es/page.tsx"), /<PublicConsultationCta locale="es" \/>/);
});
