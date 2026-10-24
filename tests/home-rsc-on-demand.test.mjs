import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("closed EN/RU/ES home shows seven steps while supporting tools load only on expansion", () => {
  const home = read("components/holistic-house-home.tsx");
  const es = read("app/es/page.tsx");
  const disclosure = read("components/home-more-disclosure.tsx");
  for (const page of [home, es]) {
    assert.match(page, /<HomeMoreDisclosure locale=/);
    assert.match(page, /<HomeFeaturedWorkspace locale=/);
    assert.ok(page.indexOf("<HomeSectionCarousel") < page.indexOf("<HomeFeaturedWorkspace"));
    assert.ok(page.indexOf("<HomeFeaturedWorkspace") < page.indexOf("<HomeMoreDisclosure"));
    for (const duplicated of ["HomeFreeDiagnosisBanner", "HomeConversationGuide",
      "HomePersonalSpaceCard", "HomepageTopicJourneys"]) {
      assert.ok(!page.includes("<" + duplicated), duplicated + " is not repeated by the page");
    }
    assert.doesNotMatch(page, /<ServicesSolutions |<HomeExploreSections |<TestSelectionCourseBanner /);
  }
  assert.match(disclosure, /data-home-more-deferred="true"/);
  assert.match(disclosure, /onToggle=\{event => setExpanded\(event.currentTarget.open\)\}/);
  assert.match(disclosure, /\{expanded && \(/);
  assert.match(disclosure, /\{expanded \? \(locale === "es"/);
  const modules = {
    ServicesSolutions: "services-solutions",
    TestSelectionCourseBanner: "sitewide-antistress-banner",
    HomeExploreSections: "home-explore-sections",
    HomeFreeDiagnosisBanner: "home-free-diagnosis-banner",
    HomeConversationGuide: "home-conversation-guide",
    HomePersonalSpaceCard: "home-personal-space",
    HomepageTopicJourneys: "homepage-topic-journeys",
  };
  for (const [component, path] of Object.entries(modules)) {
    assert.ok(disclosure.includes('import("./' + path + '")'), component + " is dynamically imported");
    if (["HomeFreeDiagnosisBanner","HomeConversationGuide","HomePersonalSpaceCard","HomepageTopicJourneys"].includes(component)) {
      assert.ok(disclosure.includes("<" + component + " locale={locale} />"), component + " mounts when opened");
    }
  }
  assert.match(disclosure, /ssr: false/);
  assert.match(disclosure, /<noscript>/);
  for (const route of ["services", "client/tests", "academy"]) assert.ok(disclosure.includes(route), route);
  assert.doesNotMatch(disclosure, /fetch\(|sendBeacon|localStorage|dangerouslySetInnerHTML|\/api\/client/);
  assert.match(home, /introVideoContent/);
  assert.match(home, /<PersonalTestimonials locale=\{locale\} variant="home" \/>/);
  assert.match(es, /<PersonalTestimonials locale="es" variant="home" \/>/);
});

test("deferred catalogue imports existing reviewed modules without duplicating service records", () => {
  const disclosure = read("components/home-more-disclosure.tsx");
  const services = read("components/services-solutions.tsx");
  const explore = read("components/home-explore-sections.tsx");
  assert.match(disclosure, /<ServicesSolutions locale=\{locale\} variant="home" \/>/);
  assert.match(disclosure, /<HomeExploreSections locale="es" \/>/);
  assert.match(disclosure, /<HomeExploreSections locale=\{locale\} \/>/);
  assert.match(services, /coreServiceOffers/);
  assert.match(explore, /data-home-start data-home-sections="photo-left"/);
});
