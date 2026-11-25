import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { activeNavigationId, getSiteNavigation, getCompactNavigation } from '../lib/site-navigation-model.js';

test('Tests, Business and My House retain their exact mobile positions and destinations', async () => {
  const mobile = await readFile('components/mobile-bottom-navigation.tsx', 'utf8');
  assert.match(mobile, /getCompactNavigation\(locale\)/);
  assert.match(mobile, /mobileItems\.map/);
  for (const locale of ['ru', 'en', 'es']) {
    const links = getCompactNavigation(locale);
    assert.deepEqual(links.map(item => item.id), ['home','tests','services','academy','business','house']);
    assert.equal(links[1].href, `/${locale}/client/tests`);
    assert.equal(links[4].href, `/${locale}/explore/business`);
    assert.equal(getSiteNavigation(locale).find(item => item.id === 'library').href, `/${locale}/library`);
    assert.equal(links[5].href, `/${locale==='es'?'en':locale}/app`);
    assert.equal(activeNavigationId(`/${locale}/academy/free-ai-courses`), 'academy');
    assert.equal(activeNavigationId(`/${locale}/about`), 'about');
  }
});

test('public course pages offer a free start with real 14-day program IDs and preserved cabinet enrollment', async () => {
  const [landing, enRu, spanish, style] = await Promise.all([
    readFile('components/public-growth-courses.tsx', 'utf8'),
    readFile('app/[locale]/courses/page.tsx', 'utf8'),
    readFile('app/es/courses/page.tsx', 'utf8'),
    readFile('components/public-growth-courses.module.css', 'utf8'),
  ]);
  assert.match(landing, /data-public-my-courses/);
  assert.match(landing, /const programmeIds = \["stress"\]/);
  assert.match(landing, /\/app\/course/);
  assert.match(landing, /\?program=stress/);
  assert.doesNotMatch(landing, /\?entry=personal/);
  assert.match(landing, /Start for free/);
  assert.match(landing, /Начать бесплатно/);
  assert.match(enRu, /generateMetadata/);
  assert.match(spanish, /permanentRedirect\("\/es\/academy\/free-ai-courses"\)/);
  assert.match(enRu, /permanentRedirect/);
  assert.match(landing, /id="my-courses"/);
  assert.match(landing, /Free AI courses/);
  assert.match(style, /@media \(max-width: 700px\)/);
});

test('About stays reachable via Services for all languages', async () => {
  const [entry, services, spanish] = await Promise.all([
    readFile('components/services-about-entry.tsx', 'utf8'),
    readFile('app/[locale]/services/page.tsx', 'utf8'),
    readFile('app/es/services/page.tsx', 'utf8'),
  ]);
  assert.match(entry, /data-services-about-entry/);
  assert.match(entry, /\/about/);
  assert.match(services, /<ServicesAboutEntry locale=\{locale as Locale\}/);
  assert.match(spanish, /<ServicesAboutEntry locale="es"/);
});


test('OPORA methodology page is linked, localized, accessible and evidence-honest', async () => {
  const [landing, methodPage, spanishPage, component, style, localeModel, sitemap, methodology] = await Promise.all([
    readFile('components/public-growth-courses.tsx', 'utf8'),
    readFile('app/[locale]/courses/methodology/page.tsx', 'utf8'),
    readFile('app/es/courses/methodology/page.tsx', 'utf8'),
    readFile('components/public-course-methodology.tsx', 'utf8'),
    readFile('components/public-course-methodology.module.css', 'utf8'),
    readFile('lib/public-locales.ts', 'utf8'),
    readFile('app/sitemap.ts', 'utf8'),
    readFile('docs/myspace/HOLISTIC_HOUSE_OPORA_COURSE_METHODOLOGY_CANONICAL_2026-10-14.md', 'utf8'),
  ]);
  assert.match(landing, /\/courses\/methodology/);
  assert.match(landing, /Узнать о методе ОПОРА/);
  assert.match(landing, /Explore the OPORA Method/);
  assert.match(methodPage, /generateMetadata/);
  assert.match(methodPage, /PublicCourseMethodology locale=\{locale\}/);
  assert.match(spanishPage, /PublicCourseMethodology locale="es"/);
  assert.match(component, /data-course-methodology/);
  assert.match(component, /Метод ОПОРА/);
  assert.match(component, /The OPORA Method/);
  assert.match(component, /Método OPORA/);
  assert.match(component, /не подтверждена отдельными клиническими исследованиями/);
  assert.match(component, /has not been independently validated/);
  assert.match(component, /not a diagnosis/i);
  assert.match(style, /@media\(max-width:700px\)/);
  assert.match(style, /course-focus-mountain-boy\.webp/);
  assert.match(localeModel, /courses\(\?:\\\/methodology\)\?/);
  for (const locale of ['ru','en','es']) assert.match(sitemap, new RegExp('/' + locale + '/courses/methodology'));
  assert.match(methodology, /Авторство Holistic House/);
  assert.match(methodology, /Доказанность компонентов/);
});

 test('all public course locales are explicitly registered in the sitemap', async () => {
  const sitemap = await readFile('app/sitemap.ts', 'utf8');
  const publicPaths = sitemap.match(/const publicPaths = \[([^;]+)\];/)[1];
  for (const locale of ['en', 'ru', 'es']) assert.ok(publicPaths.includes(`'/${locale}/courses/antistress'`));
});
