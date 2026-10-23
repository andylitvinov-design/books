import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("closed EN/RU/ES homepage details omit heavyweight catalogue markup from initial Flight", () => {
  const home = read("components/holistic-house-home.tsx");
  const es = read("app/es/page.tsx");
  const disclosure = read("components/home-more-disclosure.tsx");
  for (const page of [home, es]) {
    assert.match(page, /<HomeMoreDisclosure locale=/);
    assert.doesNotMatch(page, /<ServicesSolutions |<HomeExploreSections |<HomepageTopicJourneys |<TestSelectionCourseBanner /);
    assert.match(page, /<HomeConversationGuide/);
    assert.ok(page.indexOf("<HomeSectionCarousel") < page.indexOf("<HomeFreeDiagnosisBanner"));
    assert.ok(page.indexOf("<HomeFreeDiagnosisBanner") < page.indexOf("<HomeConversationGuide"));
  }
  assert.match(disclosure, /data-home-more-deferred="true"/);
  assert.match(disclosure, /onToggle=\{event => setExpanded\(event\.currentTarget\.open\)\}/);
  assert.match(disclosure, /\{expanded \? \(locale === "es"/);
  for (const tag of [
    "ServicesSolutions", "HomepageTopicJourneys", "TestSelectionCourseBanner", "HomeExploreSections",
  ]) {
    assert.match(disclosure, new RegExp("dynamic\\(\\s*\\(\\) => import\\(\"\\./" + ({
      ServicesSolutions: "services-solutions",
      HomepageTopicJourneys: "homepage-topic-journeys",
      TestSelectionCourseBanner: "sitewide-antistress-banner",
      HomeExploreSections: "home-explore-sections",
    })[tag] + "\"\\)"));
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
