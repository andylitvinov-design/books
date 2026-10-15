import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { activeNavigationId, getSiteNavigation } from '../lib/site-navigation-model.js';

test('My Courses replaces About in six-slot public bottom menu', () => {
  for (const locale of ['ru', 'en', 'es']) {
    const links = getSiteNavigation(locale).filter(item => item.id !== 'relationships');
    assert.deepEqual(links.map(item => item.id), ['home', 'library', 'services', 'academy', 'courses', 'cabinet']);
    assert.equal(links.find(item => item.id === 'courses').href, `/${locale}/courses`);
    assert.equal(activeNavigationId(`/${locale}/courses`), 'courses');
    assert.equal(activeNavigationId(`/${locale}/about`), 'services');
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
  assert.match(spanish, /PublicGrowthCourses locale="es"/);
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
