import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Spanish Alchemy shares the ten media-led chapters in EN/RU", () => {
  const enRoute = read("app/[locale]/services/alchemy-of-soul/page.tsx");
  const esRoute = read("app/es/services/alchemy-of-soul/page.tsx");
  const landing = read("components/alchemy-soul-landing.tsx");
  assert.match(enRoute, /<AlchemySoulLanding locale=\{locale as PublicLocale\} \/>/);
  assert.match(esRoute, /<AlchemySoulLanding locale="es" \/>/);
  assert.match(esRoute, /<DistanceHomeopathyGuide locale="es" embedded \/>/);
  assert.match(esRoute, /data-alchemy-extended-guide/);
  assert.doesNotMatch(esRoute, /CoreServiceDetail/);
  assert.match(enRoute, /es: "\/es\/services\/alchemy-of-soul"/);
  for (const id of ["featured-video", "hero", "situations", "method", "report", "video", "reviews", "formats", "faq", "request"]) {
    assert.match(landing, new RegExp('data-alchemy-panel="' + id + '"'));
  }
  for (const phrase of ["Alquimia del Alma", "Diagnóstico de la situación", "Constelación sistémica", "Hipnoterapia con imágenes", "Psicohomeopatía opcional"]) {
    assert.ok(landing.includes(phrase), phrase);
  }
  assert.match(landing, /getServiceVideoMedia\("alchemy", locale\)/);
  assert.match(landing, /El audio original está en inglés/);
  assert.match(landing, /homeopatía no tiene pruebas fiables/);
  // The actual featured recordings declare their own audio language:
  // Russian for /ru, the approved English recording for /en and /es.
  assert.match(landing, /language: "en" as const/);
  assert.match(landing, /language: "ru" as const/);
  assert.match(landing, /const featuredIntroVideo = locale === "ru" \? featuredIntroVideoRu : featuredIntroVideoEn;/);
  assert.match(landing, /<SiteVideoPlayer video=\{featuredIntroVideo\} locale=\{locale\}/);
});

test("Spanish Alchemy booking formats, safe handoff and navigation mirror EN/RU", () => {
  const form = read("components/alchemy-soul-lead-form.tsx");
  const landing = read("components/alchemy-soul-landing.tsx");
  const review = read("app/[locale]/services/free-situation-review/page.tsx");
  const redirect = read("app/[locale]/services/psychohomeopathy/page.tsx");
  for (const phrase of ["Sesión personal · 60 minutos · €100", "Revisión exprés · 30 minutos · €50", "Acompañamiento de cuatro semanas", "¿Cómo te llamas?", "Reserva con tu teléfono o Google"]) {
    assert.ok(form.includes(phrase), phrase);
  }
  for (const selection of ["30", "60", "month"]) {
    assert.match(form, new RegExp('data-alchemy-format="' + selection + '"'));
  }
  assert.match(landing, /<AlchemySoulLeadForm locale=\{locale\} \/>/);
  assert.match(form, /<ContactChannelChooser locale=\{locale\}/);
  assert.match(form, /pagePath: "\/" \+ locale \+ "\/services\/alchemy-of-soul"/);
  assert.doesNotMatch(form, /localStorage|sendBeacon|fetch\(/);
  assert.match(form, /hh-alchemy-contact-format/);
  assert.match(form, /bookingSku=\{selected === "30"/);
  assert.match(redirect, /permanentRedirect\("\/" \+ locale \+ "\/services\/alchemy-of-soul"\)/);
  assert.doesNotMatch(review, /locale === "es" \? "\/en\/services\/alchemy-of-soul"/);
});

test("Spanish Services shares the concise personal studio with EN/RU and original videos", () => {
  const es = read("app/es/services/page.tsx");
  const studio = read("components/services-studio-offers.tsx");
  const videos = read("components/services-studio-extras.tsx");
  const offers = read("data/core-service-offers.ts");
  const reviews = read("components/personal-testimonials.tsx");
  assert.match(es, /<ServicesStudioOffers locale="es" \/>/);
  assert.match(es, /<ServicesIntroMedia locale="es" \/>/);
  assert.match(es, /<PersonalTestimonials locale="es" variant="services" \/>/);
  assert.match(es, /<ServicesMethodVideos locale="es" \/>/);
  assert.match(videos, /<ServiceVideoShowcase locale="es" topic="overview"/);
  assert.match(videos, /id="method-videos"/);
  assert.match(studio, /type \{ PublicLocale \}/);
  assert.match(studio, /€50 \/ 30 min · €100 \/ 60 min/);
  assert.match(offers, /Perfil gratuito de recursos Wu Xing/);
  assert.match(offers, /route: "alchemy-of-soul"/);
  assert.match(reviews, /Audio original en inglés/);
});
