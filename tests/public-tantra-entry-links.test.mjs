import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const empty = () => null;
const anchor = ({ href, children, prefetch, event, attributes, ...props }) => React.createElement('a', { ...props, href }, children);

// Render the real page components, stubbing unrelated child UI and framework
// hooks so these checks need neither a server nor external data or requests.
function loadComponent(path, imports, source = read(path)) {
  const compiled = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const exports = {};
  runInNewContext(compiled, {
    exports,
    require(name) {
      if (name === 'react/jsx-runtime') return require(name);
      if (Object.hasOwn(imports, name)) return imports[name];
      throw new Error('Unexpected dependency in ' + path + ': ' + name);
    },
  });
  return exports;
}

const publicArtwork = loadComponent('lib/public-card-artwork.ts', { '@/data/public-card-artwork-urls.json': JSON.parse(read('data/public-card-artwork-urls.json')) });
const shared = {
  react: React,
  '@/lib/public-card-artwork': publicArtwork,
  'next/link': anchor,
  'next/image': empty,
  'lucide-react': { ChevronDown: empty, ArrowUpRight: empty, FileText: empty, ClipboardCheck: empty, GraduationCap: empty, ChevronRight: empty, BriefcaseBusiness: empty, Flower2: empty, Sparkles: empty, ArrowRight: empty },
  '@/components/static-portrait': { StaticPortrait: empty },
  '@/components/public-site-header': { PublicSiteHeader: empty },
};
shared['@/components/discovery-section-tabs']=loadComponent('components/discovery-section-tabs.tsx',{'next/link':anchor,'./discovery-section-tabs.module.css':{}});
const freePaths = loadComponent('components/home-free-paths.tsx', {
  ...shared,
  '@/components/acquisition-event-link': { AcquisitionEventLink: anchor },
  './home-free-paths.module.css': {},
}).HomeFreePaths;
shared['@/components/home-free-paths'] = { HomeFreePaths: freePaths };
// Actual carousel exposes the canonical Energy/Love/Business directions.
shared['@/components/home-section-carousel'] = loadComponent('components/home-section-carousel.tsx', {
  ...shared, react: React,
  'lucide-react': {...shared['lucide-react'], ChevronLeft:empty},
  './services-conversion-hero.module.css': {},
});
shared['@/components/home-free-diagnosis-banner'] = {HomeFreeDiagnosisBanner:empty};
shared['@/components/home-conversation-guide'] = {HomeConversationGuide:empty};
shared['@/components/homepage-topic-journeys'] = {HomepageTopicJourneys:empty};
shared['@/components/personal-testimonials'] = {PersonalTestimonials:empty};
shared['@/components/home-personal-space'] = {HomePersonalSpaceProvider:({children})=>children, HomePersonalSpaceCard:empty};
const explore = loadComponent('components/home-explore-sections.tsx', {
  ...shared, '@/components/acquisition-event-link':{AcquisitionEventLink:anchor},
  'lucide-react':{...shared['lucide-react'],BookOpen:empty,LockKeyhole:empty},
  './home-explore-sections.module.css':{},
}).HomeExploreSections;
let expanded = false;
async function loadDisclosure(source = read('components/home-more-disclosure.tsx')) {
  const pending=[];
  const exports=loadComponent('components/home-more-disclosure.tsx', {
    ...shared, react:{...React,useState:()=>[expanded,value=>{expanded=value;}]},
    './services-solutions':{ServicesSolutions:empty},
    './homepage-topic-journeys':{HomepageTopicJourneys:empty},
    './sitewide-antistress-banner':{TestSelectionCourseBanner:empty},
    './home-explore-sections':{HomeExploreSections:explore},
    'next/dynamic':loader=>{
      let Component;
      pending.push(loader().then(value=>{assert.equal(typeof value,'function');Component=value;}));
      return props=>React.createElement(Component,props);
    },
  },source);
  await Promise.all(pending);
  return exports.HomeMoreDisclosure;
}
const HomeMoreDisclosure=await loadDisclosure();
shared['@/components/home-more-disclosure']={HomeMoreDisclosure};
function openDirections(locale, Disclosure=HomeMoreDisclosure) {
  expanded=false;
  const closed=Disclosure({locale});
  assert.equal(closed.props['data-home-more-deferred'],'true');
  assert.doesNotMatch(renderToStaticMarkup(closed),/id="home-explore-title"/);
  closed.props.onToggle({currentTarget:{open:true}});
  const opened=renderToStaticMarkup(Disclosure({locale}));
  assert.match(opened,/id="home-explore-title"/);
  // Exclude noscript fallback: Academy must exist in the real expanded cards.
  const cards=opened.replace(/<noscript>[\s\S]*?<\/noscript>/g,'');
  assert.ok(links(cards).some(link=>link.href==='/' + locale + '/academy'));
}
const home = loadComponent('components/holistic-house-home.tsx', {
  ...shared,
  '@/components/acquisition-event-link': { AcquisitionEventLink: anchor },
  '@/components/homepage-contact-cta': { HomepageContactCta: empty },
  '@/components/services-solutions': { ServicesSolutions: empty },
  '@/components/homepage-topic-journeys': { HomepageTopicJourneys: empty },
  '@/components/home-free-tests-banner': { HomeFreeTestsBanner: empty },
  '@/components/personal-testimonials': { PersonalTestimonials: empty },
  '@/components/site-navigation': { SiteNavigation: empty },
  '@/components/sitewide-antistress-banner': { TestSelectionCourseBanner: empty },
  '@/data/local-acquisition': { LOCAL_ACQUISITION: Object.fromEntries(['en', 'ru'].map((locale) => [locale, {
    hero: { eyebrow: 'Holistic House', servicesLabel: 'Services' },
    selfCheck: { href: `/${locale}/tests` },
    practitioner: { href: `/${locale}/about` },
  }])) },
}).HolisticHouseHome;
const spanishHome = loadComponent('app/es/page.tsx', {
  ...shared,
  '@/components/acquisition-event-link': { AcquisitionEventLink: anchor },
  '@/components/site-video-player': { SiteVideoPlayer: ({ video }) => React.createElement('span', { 'data-video-id': video.youtubeId }) },
  '@/components/public-consultation-cta': { PublicConsultationCta: empty },
  '@/lib/spanish-metadata': { spanishMetadata: empty },
}).default;
// Render the real interactive Academy hero, including its localized links and
// initial unfiltered program choices. React hooks work in server rendering.
const courseCards = { AcademyCourseCardList: ({ items }) => items.map((item) => React.createElement('a', { key: item.id, href: item.href }, item.title + ' · ' + item.subtitle)) };
const academyDiscovery = loadComponent('components/academy-discovery.tsx', {
  ...shared,
  react: React,
  'lucide-react': { ...shared['lucide-react'], ChevronDown: empty, Search: empty, BookOpen:empty, CalendarDays:empty, MapPin:empty },
  '@/components/academy-my-courses': {AcademyMyCourses:empty},
  '@/components/academy-course-card-list': courseCards,
  './academy-discovery.module.css': {},
}).AcademyDiscovery;
const publicEvents = loadComponent('data/public-events.ts', {});
const freeCourse = loadComponent('lib/academy/reiki-free-course.ts', {});
const academy = loadComponent('components/academy-hub.tsx', {
  ...shared,
  '@/lib/academy/reiki-free-course': freeCourse,
  '@/data/public-events':publicEvents,
  '@/components/academy-discovery': { AcademyDiscovery: academyDiscovery },
  '@/components/academy-video-courses': { AcademyVideoCourses: empty },
  '@/components/academy-course-capture': { AcademyCourseCapture: empty },
  '@/components/academy-free-course-banner': { AcademyFreeCourseBanner: empty },
  '@/data/academy/catalog': { academyCopy: Object.fromEntries(['en', 'ru', 'es'].map((locale) => [locale, {
    title: 'Academy', programs: 'Programs', videos: 'Videos', lead: 'Explore learning', allPrograms: 'All programs',
  }])) },
}).AcademyHub;

const links = (html) => [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(([, href, content]) => ({ href, text: content.replace(/<[^>]+>/g, '') }));
const renderLinks = (component, props) => links(renderToStaticMarkup(React.createElement(component, props)).replace(/<noscript>[\s\S]*?<\/noscript>/g,''));
const labels = { en: /Tantra Reiki.*free Level 1 initiation/, ru: /Тантра Рейки.*бесплатная инициация 1-й ступени/, es: /Tantra Reiki.*iniciación gratuita de Nivel 1/ };
const courseLabels = { en: /Tantra Reiki.*Level 1/, ru: /Тантра Рейки.*1 ступень/, es: /Tantra Reiki.*Nivel 1/ };

for (const locale of ['en', 'ru', 'es']) {
  test(`${locale} Home exposes its current Academy discovery route and preserves review and books`, () => {
    openDirections(locale);
    const pageLinks = renderLinks(locale === 'es' ? spanishHome : home, { locale });
    assertHomeDiscovery(pageLinks,locale);

  });

  test(`${locale} Academy has a direct Tantra free card and an independent video archive`, () => {
    const cards = renderLinks(academy, { locale, view: 'programs' });
    const tantra = cards.filter((link) => link.href === `/${locale}/academy/reiki/tantra-reiki/free-initiation`);
    assert.equal(tantra.length, 1);
    assert.match(tantra[0].text, courseLabels[locale]);
    assert.ok(cards.some((link) => link.href === `/${locale}/academy/reiki/tantra-reiki`));
    const videoLinks = renderLinks(academy, { locale, view: 'videos' });
    assert.ok(videoLinks.some((link) => link.href === `/${locale}/academy`));
  });
}

for (const locale of ['en', 'ru', 'es']) {
  test(`${locale} inline course CTA preserves its quick-entry route and discloses any English fallback`, () => {
    const banner = loadComponent('components/sitewide-antistress-banner.tsx', {
      ...shared,
      'next/navigation': { usePathname: () => `/${locale}/academy` },
      './sitewide-antistress-banner.module.css': {},
    }).TestSelectionCourseBanner;
    const pageLinks = renderLinks(banner, { locale });
    const target = locale === 'es' ? 'en' : locale;
    const cta = pageLinks.find((link) => link.href === `/${target}/app/course?program=stress&amp;entry=quick`);
    assert.ok(cta);
    assert.equal(cta.text, { en: 'Start the free course', ru: 'Пройти курс бесплатно', es: 'Empezar el curso en inglés' }[locale]);
    assert.ok(pageLinks.some((link) => link.href === `/${locale}/courses/antistress`));
  });
}

for (const locale of ['en', 'ru', 'es']) {
  test(`${locale} retains the approved screenshot banner with free-review links on both sides`, () => {
    const banner = loadComponent('components/sitewide-antistress-banner.tsx', {
      ...shared,
      'next/navigation': { usePathname: () => `/${locale}/academy` },
      './sitewide-antistress-banner.module.css': {},
    }).SitewideAntistressBanner;
    const pageLinks = renderLinks(banner, { initialLocale: locale });
    assert.deepEqual(pageLinks.map((link) => link.href), [
      `/${locale}/services/free-situation-review`,
      `/${locale}/services/free-situation-review`,
    ]);
    assert.match(pageLinks[1].text, {
      en: /Get free review/,
      ru: /Получить разбор/,
      es: /Solicitar gratis/,
    }[locale]);
  });
}


test('Home retains server-provided intro content and consultation CTA after contextual link addition', () => {
  for (const locale of ['en', 'ru']) {
    const html = renderToStaticMarkup(React.createElement(home, { locale, introVideoContent: React.createElement('section', { 'data-streamed-intro': 'preserved' }, 'Original intro') }));
    assert.match(html, /data-streamed-intro="preserved"/);
    assert.ok(links(html).some((link) => link.href === `/${locale}/services#consultation`));
  }
  assert.ok(renderLinks(spanishHome, {}).some((link) => link.href === '/es/services#consultation'));
});

test('Spanish homepage keeps current section discovery instead of removed learning-card videos', () => {
  openDirections('es');
  const html = renderToStaticMarkup(React.createElement(spanishHome));
  const pageLinks = links(html);
  for (const path of ['/es/academy', '/es/client/tests', '/es/services', '/es/explore/business', '/es/books', '/es/about']) {
    assert.ok(pageLinks.some(link => link.href === path), path);
  }
  assert.match(html, /Andrey Litvinov/);
  assert.match(html, /data-home-more-deferred="true"/);
});


for (const locale of ['en', 'ru', 'es']) {
  test(`${locale} preserves standalone free-path destinations and current personal-session-first hero`, () => {
    const options = renderLinks(freePaths, { locale });
    assert.deepEqual(options.map((link) => link.href), [
      `/${locale}/services/free-situation-review`, `/${locale}/wu-xing`, `/${locale}/client/tests`,
    ]);
    openDirections(locale);
    const html = renderToStaticMarkup(React.createElement(locale === 'es' ? spanishHome : home, { locale }));
    const hero = html.match(/<section class="service-home-hero"[\s\S]*?<\/section>/)?.[0];
    assert.ok(hero);
    assert.deepEqual(links(hero).map((link) => link.href), [
      `/${locale}/services#consultation`, `/${locale}/services/free-situation-review`, `/${locale}/client/tests`,
    ]);
    assertHomeDiscovery(links(html),locale);
  });
}


function assertHomeDiscovery(pageLinks, locale) {
  for (const path of ['/academy','/services/free-situation-review','/books']) {
    assert.ok(pageLinks.some(link => link.href === '/' + locale + path), 'Current public destination: ' + path);
  }
  assert.equal(pageLinks.filter(link=>link.href==='/' + locale + '/academy/reiki/tantra-reiki/free-initiation').length,0,
    'Home does not claim a removed direct Tantra card; Academy owns that entry');
}
for (const fault of ['missing Academy','wrong Academy']) test('homepage discovery proof rejects ' + fault, () => {
  openDirections('en');
  let pageLinks=renderLinks(home,{locale:'en'});
  if(fault==='missing Academy') pageLinks=pageLinks.filter(link=>link.href!=='/en/academy');
  else pageLinks=pageLinks.map(link=>link.href==='/en/academy'?{...link,href:'/en/wrong'}:link);
  assert.throws(()=>assertHomeDiscovery(pageLinks,'en'));
});

test('Home Academy discovery rejects a disconnected native disclosure callback',async()=>{
  const source=read('components/home-more-disclosure.tsx');
  const mutant=source.replace('setExpanded(event.currentTarget.open)','setExpanded(false)');
  assert.notEqual(mutant,source);
  const Broken=await loadDisclosure(mutant);
  assert.throws(()=>openDirections('en',Broken));
});
test('Home Academy discovery rejects a missing dynamic export',async()=>{
  const source=read('components/home-more-disclosure.tsx');
  const mutant=source.replace('mod.HomeExploreSections','mod.MissingExploreSections');
  assert.notEqual(mutant,source);
  await assert.rejects(loadDisclosure(mutant));
});
