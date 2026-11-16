import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("new dialog-first Home never fetches a video or legacy personal archive at startup",()=>{
 const en=read("app/page.tsx"),ru=read("app/[locale]/page.tsx"),es=read("app/es/page.tsx"),home=read("components/holistic-house-home.tsx");
 assert.match(en,/<HolisticHouseHome locale="en" \/>/);
 assert.match(ru,/<HolisticHouseHome locale="ru" \/>/);
 assert.match(es,/<HomeDialogFirst locale="es"\/>/);
 assert.match(home,/<HomeDialogFirst locale=\{locale\}\/>/);
 assert.doesNotMatch(home,/HomePresentationVideoSection|HomeIntroVideoSection|getPublishedSiteVideo|PersonalTestimonials|SiteVideoPlayer/);
 const archived=read("components/home-presentation-video-section.tsx");
 assert.match(archived,/data-video-slot="home-presentation"/);
 assert.match(archived,/isApprovedEnglishPresentation/);
 assert.match(read("lib/crm/telegram-presentation.mjs"),/youtubeId: 'G0Db6yOCMto'/);
 assert.match(read("lib/site-videos/defaults.js"),/existingHomeIntroVideoEn/);
});

test("fast public first screen offers one conversation and real learning/service paths",()=>{
 const home=read("components/holistic-house-home.tsx"),es=read("app/es/page.tsx");
 const first=read("components/home-dialog-first.tsx"),stage=read("components/home-featured-workspace.tsx"),seo=read("lib/home-seo.ts");
 for(const source of [home,es])assert.doesNotMatch(source,/HomeSectionCarousel|HomeFeaturedWorkspace|HomeMoreDisclosure|PersonalTestimonials|ProfileHubTabs/);
 assert.match(first,/data-home-conversation-hero/);
 assert.match(first,/data-home-intent-form/);
 assert.match(first,/\/services/);
 assert.match(first,/\/academy/);
 assert.match(first,/\/client\/tests/);
 assert.match(first,/data-home-continue/);
 for(const name of ["Free courses","Бесплатные курсы","Cursos gratuitos",
   "Заказать бесплатный письменный разбор","Request a session · from €50"])assert.ok(stage.includes(name),name);
 assert.match(seo,/Personal Sessions in Toronto & Online/);
 assert.match(read("app/es/services/page.tsx"),/<PublicConsultationCta locale="es" id="consultation"/);
});

test("canonical TTFB measurement and nonce safety remain intact", () => {
  const meter = read("scripts/measure-hh-public-ttfb.mjs");
  assert.match(meter, /for \(const suffix of \['\/', '\/ru', '\/es'\]\)/);
  assert.doesNotMatch(meter, /for \(const suffix of \['\/\?lang=en', '\/\?lang=ru'\]\)/);
  assert.match(meter, /response\.status !== 200/);
  assert.match(read("middleware.ts"), /private, no-store, max-age=0, must-revalidate/);
  assert.match(read("app/layout.tsx"), /nonce=\{nonce\}/);
  assert.doesNotMatch(read("lib/site-videos/public.ts"), /force-static/);
});
