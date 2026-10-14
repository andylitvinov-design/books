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
  assert.match(landing, /const programmeIds = \["stress", "confidence", "focus"\]/);
  assert.match(landing, /\/app\/course/);
  assert.match(landing, /\?program=\$\{id\}/);
  assert.match(landing, /\?entry=personal/);
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
