import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");


test("Home ships only Ali first; seven-offer catalog remains explicitly deferred and source-backed",()=>{
 const filters=read("components/home-more-disclosure.tsx");
 const expanded=read("components/home-expanded-catalog.tsx");
 const deferred=read("components/home-deferred-sections.tsx");
 const content=read("components/home-deferred-content.tsx");
 for(const page of ["components/holistic-house-home.tsx","app/es/page.tsx"]){
  const source=read(page);
  assert.match(source,/<HomeDialogueEntry locale=/);
  assert.match(source,/<HomeDeferredSections locale=/);
  assert.ok(source.indexOf("<HomeDialogueEntry")<source.indexOf("<HomeDeferredSections"));
  assert.doesNotMatch(source,/<HomeFeaturedWorkspace|<HomeMoreDisclosure|<HomeSectionCarousel|<PersonalTestimonials/);
  assert.doesNotMatch(source,/<HomeFreeDiagnosisBanner|<HomepageTopicJourneys|<HomePersonalSpaceCard|<HomeCoreMethods|<HomeMasterPath|service-home-hero/);
  assert.doesNotMatch(source,/<ServicesSolutions|<HomeExploreSections|<TestSelectionCourseBanner/);
 }
 assert.match(deferred,/IntersectionObserver/);
 assert.match(deferred,/const HomeDeferredContent = lazy\(/);
 assert.match(deferred,/visible\?<Suspense fallback=\{null\}>/);
 assert.match(content,/HomeExpandedCatalog/);
 assert.match(content,/const HomeExpandedCatalog = lazy\(/);
 assert.match(content,/expanded\?<Suspense fallback=\{null\}>/);
 for(const item of ["HomeSectionCarousel","HomeFeaturedWorkspace","PersonalTestimonials"])
  assert.ok(expanded.includes(item),"optional catalog retains "+item);
 assert.match(filters,/data-home-topic-filters/);
 assert.match(filters,/data-home-more-deferred="true"/);
 assert.match(filters,/onToggle=\{event => setExpanded\(event\.currentTarget\.open\)\}/);
 assert.match(filters,/\{expanded \? <HomeConversationGuide locale=\{locale\} \/> : null\}/);
 assert.match(filters,/dynamic\(\s*\(\) => import\("\.\/home-conversation-guide"\)/);
 assert.match(filters,/ssr: false/);
 for(const id of ["goals-money","love-relationships","energy-confidence","stress-anxiety"])
  assert.ok(filters.includes('"'+id+'": '),id);
 for(const topic of ["temple","services","courses"])
  assert.ok(filters.includes('data-home-topic-filter="'+topic+'"'),topic);
 assert.doesNotMatch(filters,/<HomepageTopicJourneys|<ServicesSolutions|<HomeFreeDiagnosisBanner|<TestSelectionCourseBanner|<HomeExploreSections/);
 assert.doesNotMatch(filters,/fetch\(|sendBeacon|localStorage|dangerouslySetInnerHTML|\/api\/client/);
});

test("filter chips link existing localized routes with compact, accessible styling", () => {
  const jsx = read("components/home-more-disclosure.tsx");
  const css = read("components/home-more-disclosure.module.css");
  // Dynamic localized links resolve through the exact legacy SEO landing routes.
  for (const [id,route] of Object.entries({
    "goals-money":"business","love-relationships":"love",
    "energy-confidence":"energy","stress-anxiety":"stress",
  })) {
    assert.ok(jsx.includes('"' + id + '": "' + route + '"'), id + " => " + route);
  }
  assert.match(jsx,/href=\{"\/" \+ locale \+ "\/explore\/" \+ categoryRoutes\[category\.id/);
  for (const route of ["/services","/academy"]) assert.ok(jsx.includes(route),route);
  for (const label of ["ВЫБЕРИТЕ НАПРАВЛЕНИЕ","CHOOSE YOUR DIRECTION","ELIGE TU DIRECCIÓN"])
    assert.ok(jsx.includes(label));
  for (const style of ["min-height: 44px","@media (max-width: 640px)",":focus-visible","flex-wrap: wrap","prefers-reduced-motion"])
    assert.ok(css.includes(style));
  assert.match(read("components/home-expanded-catalog.tsx"),/<HomepageContactCta locale=\{locale\}\s*\/>/);
  assert.doesNotMatch(read("components/holistic-house-home.tsx"),/<HomepageContactCta/);
  assert.match(read("app/es/page.tsx"), /<PublicConsultationCta locale="es" \/>/);
});
