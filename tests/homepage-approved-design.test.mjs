import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("approved 2026-10-09 home design keeps all three service directions and original routes", () => {
  const home = read("components/holistic-house-home.tsx");
  const journey = read("components/personal-work-journey.tsx");
  assert.match(home, /<ServicesSolutions locale=\{locale\} variant="home" \/>/);
  assert.match(home, /data-home-design="approved-v2"/);
  const solutions = read("components/services-solutions.tsx");
  assert.match(solutions, /data-core-service-id=\{offer.id\}/);
  assert.match(solutions, /isHome \? homepageMedia\[offer.id\] : offer.image/);
  const offersStyle = read("components/services-solutions.module.css");
  assert.match(offersStyle, /\.home \.card/);
  assert.match(offersStyle, /\.home \.photo/);
  assert.match(journey, /text\.services\.map/);
  const offers = read("data/core-service-offers.ts");
  for (const slug of ["free-situation-review","dao-health-profile","alchemy-of-soul","hypnotherapy-course"]) assert.ok(offers.includes(slug));
  for (const slug of ["psychohomeopathy", "imagery-therapy", "systemic-constellations"]) {
    assert.ok(journey.includes(slug), "Lost service route: " + slug);
  }
  assert.match(journey, /<article className=\{styles\.service\} key=\{service\.slug\}>/);
  assert.match(journey, /"\/" \+ locale \+ "\/services\/" \+ \(!compact && service\.freeSlug \? service\.freeSlug : service\.slug\)/);
  assert.match(home, /<PersonalTestimonials locale=\{locale\} variant="home"/);
  const streamedVideo = read("components/home-intro-video-section.tsx");
  assert.match(home, /\{introVideoContent\}/);
  assert.match(streamedVideo, /<SiteVideoPlayer key=\{locale\} video=\{introVideo\}/);
  assert.match(home, /className="service-home-hero"/);
  assert.match(home, /event="self_check_start"/);
  assert.match(home, /event="service_view"/);
  const explore = read("components/home-explore-sections.tsx");
  assert.match(home, /<HomeExploreSections locale=\{locale\} \/>/);
  assert.match(explore, /academyAction: "Browse courses"/);
  assert.match(explore, /cabinetAction: "Open my Cabinet"/);
  assert.match(explore, /libraryAction: "Browse the Library"/);
});

test("homeopathy card has a complete local illustration instead of the observed broken image", () => {
  const journey = read("components/personal-work-journey.tsx");
  const svg = read("public/images/holistic-house/homeopathy-still-life.svg");
  assert.match(journey, /homeopathy-still-life\.svg/);
  assert.doesNotMatch(journey, /distance-homeopathy\.webp/);
  assert.match(svg, /<svg /);
  assert.match(svg, /<rect width="960" height="600"/);
  assert.match(svg, /<linearGradient id="amber"/);
  assert.ok(svg.length > 2000);
  assert.match(journey, /hypnotherapy-en-v1\.webp/);
  assert.match(journey, /constellations-en-v1\.webp/);
});

test("approved design uses actual teacher portrait, not the synthetic mockup person", () => {
  const home = read("components/holistic-house-home.tsx");
  assert.ok(existsSync(new URL("../public/images/holistic-house/andy-about.png", import.meta.url)));
  assert.match(home, /className="service-home-about__portrait"/);
  assert.match(home, /src="\/images\/holistic-house\/andy-about\.png"/);
  assert.match(home, /className="service-home-about__image"/);
  assert.match(home, /width=\{900\}/);
  assert.match(home, /height=\{720\}/);
  assert.match(home, /alt=\{locale === "ru" \? "Андрей Литвинов" : "Andrey Litvinov"\}/);
  assert.match(home, /<p>\{text\.aboutIntro\}<\/p>/);
  assert.match(home, /event="practitioner_view"/);
  assert.doesNotMatch(home, /generated-avatar|synthetic-portrait|mockup-person/);
});

test("premium botanical cards are responsive, keyboard-accessible and do not alter full Services", () => {
  const style = read("components/personal-work-journey.module.css");
  const homeStyle = read("app/holistic-house-home.css");
  const leaf = read("public/images/holistic-house/homepage-botanical.svg");
  assert.match(leaf, /<svg /);
  assert.match(style, /\.compact \.intro::after/);
  assert.match(style, /\.compact \.service/);
  assert.match(style, /@media\(max-width:767px\)/);
  assert.match(style, /grid-template-columns:clamp\(106px,29vw,146px\) minmax\(0,1fr\)/);
  assert.match(style, /\.full \.serviceLink/);
  assert.match(style, /:focus-visible/);
  assert.match(homeStyle, /\.house-home--services \.service-home-start__grid/);
  assert.match(homeStyle, /\.house-home--services \.service-home-start-card--learning/);
  assert.match(homeStyle, /\.house-home--services \.home-contact-capture/);
  assert.match(homeStyle, /prefers-reduced-motion:reduce/);
});

test("homepage uses the real blue enquiry chooser instead of the old beige direct-contact card", () => {
  const home = read("components/holistic-house-home.tsx");
  const cta = read("components/homepage-contact-cta.tsx");
  const capture = read("components/consultation-choice-capture.tsx");
  const captureCss = read("components/consultation-choice-capture.module.css");
  const homeStyle = read("app/holistic-house-home.css");
  assert.match(home, /<HomepageContactCta locale=\{locale\} \/>/);
  assert.match(cta, /data-home-contact-capture/);
  const homeFree = read("components/homepage-free-capture.tsx");
  assert.match(cta, /<HomepageFreeCapture locale=\{locale\} \/>/);
  assert.match(homeFree, /data-consultation-capture="home-free"/);
  assert.match(homeFree, /data-choice-layout="home-free"/);
  assert.doesNotMatch(cta, /variant="service"/);
  assert.match(capture, /serviceChoices: ServiceChoice\[\] = \["session", "questions", "free"\]/);
  assert.match(capture, /whatsappEnquiryUrl/);
  assert.match(capture, /t\.me\/AndyTherapist/);
  assert.match(capture, /services\/free-situation-review/);
  assert.match(captureCss, /linear-gradient\(125deg, #e9f7fe/);
  assert.match(homeStyle, /\.house-home--services \.home-contact-choice/);
  assert.doesNotMatch(cta, /home-contact-capture__primary|You can simply write to me/);
  assert.doesNotMatch(home, /fake-testimonial|stock-avatar/);
});

test("home restores four approved image-left service cards and their titles", () => {
  const home = read("components/holistic-house-home.tsx");
  const cards = read("components/services-solutions.tsx");
  const css = read("components/services-solutions.module.css");
  assert.match(cards, /homeTitle: "How I can help"/);
  assert.match(cards, /homeTitle: "Чем я могу помочь"/);
  assert.ok(cards.includes('const visibleOffers = isHome ? allOffers.filter((offer) => offer.id !== "business") : allOffers;'));
  assert.match(cards, /visibleOffers.map/);
  assert.match(css, /grid-template-columns:minmax\(113px,2fr\) minmax\(0,3fr\)/);
  assert.doesNotMatch(home, /data-home-extra-paths|<details className="service-home-more"/);
  assert.ok(home.indexOf("<ServicesSolutions locale={locale} variant=\"home\" />") < home.indexOf("<HomepageContactCta locale={locale} />"), "Photo-left services must be visible before bottom capture");
  assert.match(home, /<ServicesSolutions locale=\{locale\} variant="home" \/>/);
  assert.doesNotMatch(home, /<FreeInsightsPaths/);
  assert.match(home, /<HomepageContactCta locale=\{locale\} \/>/);
});
